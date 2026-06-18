<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$deviceId = trim($input['device_id'] ?? '');
$name     = trim($input['name'] ?? '');
$avatar   = trim($input['avatar'] ?? '😊');

if (!$deviceId || !$name) jsonOut(['success' => false, 'error' => 'Missing device_id or name'], 400);

$db = getDB();
cleanStale($db);

// Generate a unique room code
do {
    $code = generateCode();
    $checkStmt = $db->prepare("SELECT 1 FROM rooms WHERE code = ?");
    $checkStmt->execute([$code]);
    $exists = (bool)$checkStmt->fetchColumn();
} while ($exists);

$now = nowMs();

$db->beginTransaction();
$db->prepare("INSERT INTO rooms (code, host_device_id, status, created_at, updated_at) VALUES (?, ?, 'lobby', ?, ?)")
   ->execute([$code, $deviceId, $now, $now]);

$db->prepare("INSERT OR REPLACE INTO players (device_id, room_code, name, avatar, is_host, joined_at, last_ping) VALUES (?, ?, ?, ?, 1, ?, ?)")
   ->execute([$deviceId, $code, $name, $avatar, $now, $now]);

$db->commit();

jsonOut(['success' => true, 'room_code' => $code]);
