<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');

if (!$code || !$deviceId) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();
$db->prepare("UPDATE players SET last_ping = ? WHERE room_code = ? AND device_id = ?")
   ->execute([nowMs(), $code, $deviceId]);

jsonOut(['success' => true, 'server_time' => nowMs()]);
