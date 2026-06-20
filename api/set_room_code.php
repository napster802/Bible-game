<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$newCode  = trim($input['new_code'] ?? '');

if (!$code || !$deviceId || !$newCode) jsonOut(['success' => false, 'error' => 'Missing fields'], 400);
if (!preg_match('/^\d{1,6}$/', $newCode)) jsonOut(['success' => false, 'error' => 'Code must be up to 6 digits.'], 400);
$newCode = str_pad($newCode, 6, '0', STR_PAD_LEFT);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();

if (!$room) jsonOut(['success' => false, 'error' => 'Room not found'], 404);
if ($room['host_device_id'] !== $deviceId) jsonOut(['success' => false, 'error' => 'Only the host can change the room code.'], 403);
if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Cannot change the code after the game starts.'], 400);

// Changing the code rewrites every player row's room_code, so it's only
// safe to allow before anyone but the host has joined - otherwise a player
// already in the lobby would be silently disconnected from the old code.
$countStmt = $db->prepare("SELECT COUNT(*) FROM players WHERE room_code = ? AND is_host = 0");
$countStmt->execute([$code]);
if ((int)$countStmt->fetchColumn() > 0) {
    jsonOut(['success' => false, 'error' => 'Cannot change the code once players have joined.'], 400);
}

if ($newCode === $code) jsonOut(['success' => true, 'room_code' => $newCode]);

$existsStmt = $db->prepare("SELECT 1 FROM rooms WHERE code = ?");
$existsStmt->execute([$newCode]);
if ($existsStmt->fetchColumn()) jsonOut(['success' => false, 'error' => 'That code is already in use.'], 400);

$db->beginTransaction();
$db->prepare("UPDATE rooms SET code = ? WHERE code = ?")->execute([$newCode, $code]);
$db->prepare("UPDATE players SET room_code = ? WHERE room_code = ?")->execute([$newCode, $code]);
$db->commit();

jsonOut(['success' => true, 'room_code' => $newCode]);
