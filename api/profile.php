<?php
/* ------------------------------------------------------------
   Server-side backup of the player profile (name + avatar),
   keyed by device_id. LocalStorage on the device is still the
   primary source of truth; this lets the app restore the
   profile after the browser's local storage is cleared, as
   long as the device_id itself survived (it is also mirrored
   into a long-lived cookie for that reason - see profile.js).
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $deviceId = trim($_GET['device_id'] ?? '');
    if (!$deviceId) jsonOut(['success' => false, 'error' => 'Missing device_id'], 400);

    $stmt = $db->prepare("SELECT name, avatar, avatar_type FROM profiles WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $row = $stmt->fetch();
    if (!$row) jsonOut(['success' => false, 'error' => 'No saved profile']);

    jsonOut([
        'success' => true,
        'profile' => [
            'name'       => $row['name'],
            'avatar'     => $row['avatar'],
            'avatarType' => $row['avatar_type']
        ]
    ]);
}

$input      = getInput();
$deviceId   = trim($input['device_id'] ?? '');
$name       = trim($input['name'] ?? '');
$avatar     = trim($input['avatar'] ?? '');
$avatarType = trim($input['avatar_type'] ?? 'emoji');

if (!$deviceId || !$name || !$avatar) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db->prepare("INSERT INTO profiles (device_id, name, avatar, avatar_type, updated_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(device_id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, avatar_type = excluded.avatar_type, updated_at = excluded.updated_at")
   ->execute([$deviceId, $name, $avatar, $avatarType, nowMs()]);

jsonOut(['success' => true]);
