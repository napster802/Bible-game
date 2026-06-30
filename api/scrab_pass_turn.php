<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/scrabble_words.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');

if (!$code || !$deviceId) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'scrab_place')
    jsonOut(['success' => false, 'error' => 'Not in Scrabble turn'], 400);
if ($deviceId !== scrabCurrentPlayerId($room))
    jsonOut(['success' => false, 'error' => 'Not your turn'], 403);

$now = nowMs();
$order = json_decode($room['scrab_turn_order'] ?? '[]', true) ?: [];
$newStreak = (int)$room['scrab_pass_streak'] + 1;
$nextRound = (int)$room['scrab_round'] + 1;

// If every player has passed 5 consecutive full cycles → game over
if ($newStreak >= count($order) * 5) {
    scrabRackSubtraction($db, $code);
    $db->prepare("UPDATE rooms SET status = 'finished', scrab_pass_streak = ?, updated_at = ? WHERE code = ?")
       ->execute([$newStreak, $now, $code]);
    jsonOut(['success' => true, 'game_ended' => true]);
}

$db->prepare("UPDATE rooms SET scrab_round = ?, scrab_pass_streak = ?, scrab_turn_start_time = ?, updated_at = ? WHERE code = ?")
   ->execute([$nextRound, $newStreak, $now, $now, $code]);

jsonOut(['success' => true, 'game_ended' => false]);
