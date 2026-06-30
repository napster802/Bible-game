<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/scrabble_words.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$cells    = $input['cells'] ?? []; // [{row,col,letter,rack_idx,is_blank}]

if (!$code || !$deviceId || !is_array($cells) || empty($cells))
    jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'scrab_place')
    jsonOut(['success' => false, 'error' => 'Not in Scrabble turn'], 400);

$currentId = scrabCurrentPlayerId($room);
if ($deviceId !== $currentId)
    jsonOut(['success' => false, 'error' => 'Not your turn'], 403);

// Load player rack
$rackStmt = $db->prepare("SELECT scrab_rack FROM players WHERE room_code = ? AND device_id = ?");
$rackStmt->execute([$code, $deviceId]);
$rackJson = $rackStmt->fetchColumn();
$rack = json_decode($rackJson ?: '[]', true) ?: [];

// Validate rack indices and letters
$usedRackIndices = [];
$sanitizedCells = [];
foreach ($cells as $c) {
    $row    = (int)$c['row'];
    $col    = (int)$c['col'];
    $rIdx   = (int)$c['rack_idx'];
    $isBlank = !empty($c['is_blank']);
    $letter = strtoupper(substr(trim($c['letter'] ?? ''), 0, 1));

    if ($row < 0 || $row > 10 || $col < 0 || $col > 10)
        jsonOut(['success' => false, 'error' => 'Tile out of bounds'], 400);
    if ($rIdx < 0 || $rIdx >= count($rack))
        jsonOut(['success' => false, 'error' => 'Invalid rack index'], 400);
    if (in_array($rIdx, $usedRackIndices, true))
        jsonOut(['success' => false, 'error' => 'Duplicate rack index'], 400);
    if (!$letter)
        jsonOut(['success' => false, 'error' => 'Missing letter'], 400);

    $rackTile = $rack[$rIdx]; // letter string ('' = blank)
    if ($isBlank && $rackTile !== '')
        jsonOut(['success' => false, 'error' => 'Tile at rack index is not blank'], 400);
    if (!$isBlank && strtoupper($rackTile) !== $letter)
        jsonOut(['success' => false, 'error' => "Rack tile doesn't match letter"], 400);

    $usedRackIndices[] = $rIdx;
    $sanitizedCells[] = ['row' => $row, 'col' => $col, 'letter' => $letter];
}

// Load board and validate placement
$board = json_decode($room['scrab_board'] ?? '[]', true) ?: array_fill(0, 121, null);

// Determine if first word
$boardHasTiles = false;
foreach ($board as $cell) { if ($cell !== null) { $boardHasTiles = true; break; } }
$isFirstWord = !$boardHasTiles;

$result = scrabValidatePlacement($board, $sanitizedCells, $isFirstWord);
if (!$result['valid'])
    jsonOut(['success' => false, 'error' => $result['error']], 400);

$wordsFormed = $result['words'];
$now = nowMs();

// Compute total score
$totalScore = 0;
$allWordsInfo = [];
foreach ($wordsFormed as $wc) {
    $word  = implode('', array_column($wc, 'letter'));
    $score = scrabComputeWordScore($wc);
    $totalScore += $score;
    $allWordsInfo[] = [
        'word'  => $word,
        'score' => $score,
        'cat'   => scrabWordCategory($word),
        'note'  => scrabWordNote($word),
    ];
}

// Bonus: Miracle (all 7 rack tiles used)
$bonusName = null;
$bonusPoints = 0;
if (count($usedRackIndices) === 7) {
    $bonusName   = 'Miracle Bonus';
    $bonusPoints = 50;
    $totalScore += $bonusPoints;
}
// Bonus: Genesis (first word of the game)
if ($isFirstWord) {
    $bonusName   = $bonusName ? $bonusName . ' + Genesis Bonus' : 'Genesis Bonus';
    $bonusPoints += 20;
    $totalScore += 20;
}

// Update board with placed tiles
foreach ($sanitizedCells as $c) {
    $board[$c['row'] * 11 + $c['col']] = $c['letter'];
}

// Remove used tiles from rack and draw replacements
$bag = json_decode($room['scrab_bag'] ?? '[]', true) ?: [];
rsort($usedRackIndices); // remove from back to front to preserve indices
foreach ($usedRackIndices as $rIdx) {
    array_splice($rack, $rIdx, 1);
}
// Draw back up to 7
$drawCount = min(7 - count($rack), count($bag));
if ($drawCount > 0) {
    [$drawn, $bag] = scrabDrawTiles($bag, $drawCount);
    $rack = array_merge($rack, $drawn);
}

// Persist: board, bag, rack, score, advance turn
$db->beginTransaction();
try {
    $db->prepare("UPDATE players SET scrab_rack = ?, score = score + ? WHERE room_code = ? AND device_id = ?")
       ->execute([json_encode($rack), $totalScore, $code, $deviceId]);

    $db->prepare("UPDATE rooms SET scrab_board = ?, scrab_bag = ?, scrab_pass_streak = 0, status = 'scrab_word_result', updated_at = ? WHERE code = ?")
       ->execute([json_encode($board), json_encode($bag), $now, $code]);

    // Log the play
    $primaryWord  = $allWordsInfo[0]['word'] ?? '';
    $primaryScore = $allWordsInfo[0]['score'] ?? $totalScore;
    $db->prepare("INSERT INTO scrab_plays (room_code, device_id, turn, word, score, cells, bonus, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([$code, $deviceId, (int)$room['scrab_round'], $primaryWord, $totalScore, json_encode($sanitizedCells), $bonusName, $now]);

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    jsonOut(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
}

jsonOut([
    'success'      => true,
    'total_score'  => $totalScore,
    'words'        => $allWordsInfo,
    'bonus_name'   => $bonusName,
    'bonus_points' => $bonusPoints,
    'new_rack'     => $rack,
    'tiles_in_bag' => count($bag),
]);
