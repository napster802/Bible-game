<?php
/* ------------------------------------------------------------
   Admin-only CSV question import. Auth here mirrors js/admin.js's
   "casual client-side gate" model (not secure credential storage) -
   the hardcoded passcode is just to keep this off-by-default for
   randoms on the LAN, not a real security boundary.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

const ADMIN_PASSCODE = '12345678';

const VALID_BOOKS = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
    '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
    'Jude', 'Revelation'
];
const VALID_CATEGORIES = ['character', 'animals', 'things', 'places', 'events'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

$input = getInput();
$passcode = trim($input['admin_passcode'] ?? '');
if ($passcode !== ADMIN_PASSCODE) jsonOut(['success' => false, 'error' => 'Not authorized'], 403);

$csvText = $input['csv_text'] ?? '';
if (!is_string($csvText) || trim($csvText) === '') jsonOut(['success' => false, 'error' => 'No CSV content provided'], 400);

$lines = preg_split('/\r\n|\r|\n/', trim($csvText));
if (count($lines) < 2) jsonOut(['success' => false, 'error' => 'CSV needs a header row plus at least one question row'], 400);

$header = array_map(fn($h) => strtolower(trim($h)), str_getcsv($lines[0]));
$expected = ['book', 'category', 'difficulty', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'reference'];
$colIndex = [];
foreach ($expected as $col) {
    $idx = array_search($col, $header, true);
    $colIndex[$col] = $idx === false ? null : $idx;
}
foreach (['book', 'category', 'difficulty', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer'] as $required) {
    if ($colIndex[$required] === null) {
        jsonOut(['success' => false, 'error' => "Missing required column: $required"], 400);
    }
}

$valid = [];
$errors = [];

for ($i = 1; $i < count($lines); $i++) {
    $rowNum = $i + 1; // 1-based, matches what a spreadsheet would show
    $raw = $lines[$i];
    if (trim($raw) === '') continue;

    $cols = str_getcsv($raw);
    $get = function ($key) use ($cols, $colIndex) {
        $idx = $colIndex[$key];
        return $idx !== null && isset($cols[$idx]) ? trim($cols[$idx]) : '';
    };

    $book       = $get('book');
    $category   = strtolower($get('category'));
    $difficulty = strtolower($get('difficulty'));
    $question   = $get('question');
    $reference  = $get('reference');
    $choices    = [$get('choice1'), $get('choice2'), $get('choice3'), $get('choice4')];

    if (!in_array($book, VALID_BOOKS, true)) {
        $errors[] = "Row $rowNum: unknown book \"$book\"";
        continue;
    }
    if (!in_array($category, VALID_CATEGORIES, true)) {
        $errors[] = "Row $rowNum: category must be one of " . implode(', ', VALID_CATEGORIES);
        continue;
    }
    if (!in_array($difficulty, VALID_DIFFICULTIES, true)) {
        $errors[] = "Row $rowNum: difficulty must be one of " . implode(', ', VALID_DIFFICULTIES);
        continue;
    }
    if ($question === '') {
        $errors[] = "Row $rowNum: question text is empty";
        continue;
    }
    if (in_array('', $choices, true)) {
        $errors[] = "Row $rowNum: all four choices must be filled in";
        continue;
    }
    $lowerChoices = array_map('mb_strtolower', $choices);
    if (count(array_unique($lowerChoices)) < 4) {
        $errors[] = "Row $rowNum: the four choices must be unique";
        continue;
    }
    $answerRaw = $get('answer');
    $matchIdx = array_search(mb_strtolower($answerRaw), $lowerChoices, true);
    if ($matchIdx === false) {
        $errors[] = "Row $rowNum: answer \"$answerRaw\" does not match any of the four choices";
        continue;
    }

    $valid[] = [
        'book' => $book, 'category' => $category, 'difficulty' => $difficulty,
        'question' => $question, 'choices' => $choices,
        'answer' => $choices[$matchIdx], 'reference' => $reference
    ];
}

if (!empty($valid)) {
    $db = getDB();
    $now = nowMs();
    $stmt = $db->prepare("INSERT INTO custom_questions (book, category, difficulty, question, choice1, choice2, choice3, choice4, answer, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $db->beginTransaction();
    foreach ($valid as $row) {
        $stmt->execute([
            $row['book'], $row['category'], $row['difficulty'], $row['question'],
            $row['choices'][0], $row['choices'][1], $row['choices'][2], $row['choices'][3],
            $row['answer'], $row['reference'], $now
        ]);
    }
    $db->commit();
}

jsonOut([
    'success'  => true,
    'inserted' => count($valid),
    'failed'   => count($errors),
    'errors'   => $errors
]);
