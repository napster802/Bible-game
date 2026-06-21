<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/drawing_words.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input     = getInput();
$code      = trim($input['room_code'] ?? '');
$deviceId  = trim($input['device_id'] ?? '');
$round     = (int)($input['round'] ?? -1);
$guessText = trim($input['guess_text'] ?? '');

if (!$code || !$deviceId || $round < 0 || $guessText === '') jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'draw_active') jsonOut(['success' => false, 'error' => 'Not guessing right now'], 400);
if ((int)$room['draw_round'] !== $round) jsonOut(['success' => false, 'error' => 'Wrong round'], 400);

// Unlike submit_answer.php's trivia formats (which ship the full question/answer
// to every client), draw_word_idx is deliberately withheld from guessers while
// drawing is active, so correctness must be judged here using the server's own
// copy of the room state rather than trusting a client-supplied flag.
$isCorrect = drawWordMatches((int)$room['draw_word_idx'], $guessText);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$playerRow = $playerStmt->fetch();
if (!$playerRow) jsonOut(['success' => false, 'error' => 'Not in this room'], 403);
if ((int)$playerRow['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);
if ($deviceId === currentDrawerId($room)) jsonOut(['success' => false, 'error' => 'The drawer cannot guess'], 403);

$checkStmt = $db->prepare("SELECT 1 FROM drawing_guesses WHERE room_code = ? AND device_id = ? AND round = ? AND is_correct = 1");
$checkStmt->execute([$code, $deviceId, $round]);
if ($checkStmt->fetchColumn()) jsonOut(['success' => false, 'error' => 'You already guessed this correctly'], 400);

$guessText = mb_substr($guessText, 0, 40);
$now = nowMs();

// Every attempt (right or wrong) is logged so the round's guess feed can
// show it - drawing_guesses (below) only ever holds the one correct row per
// player per round, which isn't enough to reconstruct a full chat-style log.
$db->prepare("INSERT INTO drawing_guess_log (room_code, device_id, round, guess_text, is_correct, created_at) VALUES (?, ?, ?, ?, ?, ?)")
   ->execute([$code, $deviceId, $round, $guessText, $isCorrect ? 1 : 0, $now]);

if (!$isCorrect) {
    jsonOut(['success' => true, 'is_correct' => false]);
}

$rankStmt = $db->prepare("SELECT COUNT(*) FROM drawing_guesses WHERE room_code = ? AND round = ? AND is_correct = 1");
$rankStmt->execute([$code, $round]);
$rank = (int)$rankStmt->fetchColumn() + 1;

$db->beginTransaction();
$db->prepare("INSERT OR IGNORE INTO drawing_guesses (room_code, device_id, round, guess_text, is_correct, rank, submitted_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
   ->execute([$code, $deviceId, $round, $guessText, $rank, $now]);

$points = DRAW_GUESS_POINTS[$rank - 1] ?? 0;
if ($points > 0) {
    $db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
       ->execute([$points, $code, $deviceId]);
    $drawerId = currentDrawerId($room);
    if ($drawerId) {
        $db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
           ->execute([DRAW_DRAWER_BONUS, $code, $drawerId]);
    }
}
$db->commit();

jsonOut(['success' => true, 'is_correct' => true, 'rank' => $rank, 'points' => $points]);
