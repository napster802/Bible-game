<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$round    = (int)($input['round'] ?? -1);
$targetId = trim($input['target_device_id'] ?? '');

if (!$code || !$deviceId || $round < 0 || !$targetId) jsonOut(['success' => false, 'error' => 'Missing params'], 400);
if ($targetId === $deviceId) jsonOut(['success' => false, 'error' => 'You cannot vote for yourself'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'imp_vote') jsonOut(['success' => false, 'error' => 'Not in voting state'], 400);
if ((int)$room['impostor_round'] !== $round) jsonOut(['success' => false, 'error' => 'Wrong round'], 400);

$voterStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$voterStmt->execute([$code, $deviceId]);
$voter = $voterStmt->fetch();
if (!$voter) jsonOut(['success' => false, 'error' => 'Not in this room'], 403);
if ((int)$voter['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);
if ((int)$voter['eliminated'] === 1) jsonOut(['success' => false, 'error' => 'You have been eliminated'], 403);

$targetStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$targetStmt->execute([$code, $targetId]);
$target = $targetStmt->fetch();
if (!$target || (int)$target['is_host'] === 1 || (int)$target['eliminated'] === 1) {
    jsonOut(['success' => false, 'error' => 'Invalid vote target'], 400);
}

$checkStmt = $db->prepare("SELECT 1 FROM impostor_votes WHERE room_code = ? AND device_id = ? AND round = ?");
$checkStmt->execute([$code, $deviceId, $round]);
if ($checkStmt->fetchColumn()) jsonOut(['success' => false, 'error' => 'Already voted this round'], 400);

// Elder: vote counts as 2 (auto-triggered, one-use)
$voteWeight = 1;
$cls  = $voter['imp_class']      ?? null;
$used = (int)($voter['imp_class_used'] ?? 1);
$now  = nowMs();

if ($cls === 'elder' && $used === 0) {
    $voteWeight = 2;
    $db->prepare("UPDATE players SET imp_class_used = 1 WHERE room_code = ? AND device_id = ?")
       ->execute([$code, $deviceId]);
}

// Ranger: vote is anonymous — mark imp_class_used so voted-avatars tracker hides them
if ($cls === 'ranger' && $used === 0) {
    $db->prepare("UPDATE players SET imp_class_used = 1 WHERE room_code = ? AND device_id = ?")
       ->execute([$code, $deviceId]);
}

$db->prepare("INSERT OR IGNORE INTO impostor_votes (room_code, device_id, round, target_device_id, vote_weight, submitted_at) VALUES (?, ?, ?, ?, ?, ?)")
   ->execute([$code, $deviceId, $round, $targetId, $voteWeight, $now]);

jsonOut(['success' => true]);
