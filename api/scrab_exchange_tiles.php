<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/scrabble_words.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$indices  = $input['indices'] ?? []; // rack indices to swap back

if (!$code || !$deviceId || !is_array($indices) || empty($indices))
    jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'scrab_place')
    jsonOut(['success' => false, 'error' => 'Not in Scrabble turn'], 400);
if ($deviceId !== scrabCurrentPlayerId($room))
    jsonOut(['success' => false, 'error' => 'Not your turn'], 403);

$bag = json_decode($room['scrab_bag'] ?? '[]', true) ?: [];
if (count($bag) < 7)
    jsonOut(['success' => false, 'error' => 'Not enough tiles in bag to exchange (need 7)'], 400);

$rackStmt = $db->prepare("SELECT scrab_rack FROM players WHERE room_code = ? AND device_id = ?");
$rackStmt->execute([$code, $deviceId]);
$rack = json_decode($rackStmt->fetchColumn() ?: '[]', true) ?: [];

// Validate and collect tiles to return
$swapTiles = [];
$sortedIdx = array_unique(array_map('intval', $indices));
sort($sortedIdx);
foreach ($sortedIdx as $rIdx) {
    if ($rIdx < 0 || $rIdx >= count($rack))
        jsonOut(['success' => false, 'error' => 'Invalid rack index'], 400);
    $swapTiles[] = $rack[$rIdx];
}

// Remove from rack (back to front)
rsort($sortedIdx);
foreach ($sortedIdx as $rIdx) {
    array_splice($rack, $rIdx, 1);
}

// Draw replacements first, then return old tiles to shuffled bag
$drawCount = count($swapTiles);
[$drawn, $bag] = scrabDrawTiles($bag, $drawCount);
$rack = array_merge($rack, $drawn);

// Return swapped tiles to bag at random position
foreach ($swapTiles as $tile) {
    $pos = random_int(0, count($bag));
    array_splice($bag, $pos, 0, [$tile]);
}

$now = nowMs();
$nextRound = (int)$room['scrab_round'] + 1;
$newStreak = (int)$room['scrab_pass_streak'] + 1;

$db->prepare("UPDATE players SET scrab_rack = ? WHERE room_code = ? AND device_id = ?")
   ->execute([json_encode($rack), $code, $deviceId]);
$db->prepare("UPDATE rooms SET scrab_bag = ?, scrab_round = ?, scrab_pass_streak = ?, scrab_turn_start_time = ?, updated_at = ? WHERE code = ?")
   ->execute([json_encode($bag), $nextRound, $newStreak, $now, $now, $code]);

jsonOut(['success' => true, 'new_rack' => $rack, 'tiles_in_bag' => count($bag)]);
