<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$name     = trim($input['name'] ?? '');
$avatar   = trim($input['avatar'] ?? '😊');

if (!$code || !$deviceId || !$name) jsonOut(['success' => false, 'error' => 'Missing fields'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();

if (!$room) jsonOut(['success' => false, 'error' => 'Room not found. Check the code.'], 404);
if ($room['status'] === 'finished') jsonOut(['success' => false, 'error' => 'This game has ended.'], 400);
if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game already in progress.'], 400);

// Count current players (re-joining with the same device_id should not count twice)
$existingStmt = $db->prepare("SELECT 1 FROM players WHERE room_code = ? AND device_id = ?");
$existingStmt->execute([$code, $deviceId]);
$alreadyJoined = (bool)$existingStmt->fetchColumn();

if (!$alreadyJoined) {
    $countStmt = $db->prepare("SELECT COUNT(*) FROM players WHERE room_code = ?");
    $countStmt->execute([$code]);
    $playerCount = (int)$countStmt->fetchColumn();

    if ($playerCount >= 20) jsonOut(['success' => false, 'error' => 'Room is full (20 players max).'], 400);
}

$now = nowMs();
$db->prepare("INSERT OR REPLACE INTO players (device_id, room_code, name, avatar, is_host, joined_at, last_ping) VALUES (?, ?, ?, ?, 0, ?, ?)")
   ->execute([$deviceId, $code, $name, $avatar, $now, $now]);

jsonOut(['success' => true, 'room_code' => $code, 'difficulty' => $room['difficulty']]);
