<?php
/* ------------------------------------------------------------
   Live reactions and quick-chat, broadcast to everyone in the
   room via room_state.php's polling. Both reactions and chat
   are restricted to a fixed allow-list (no free text) so this
   stays a fun, low-moderation feature.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

const ALLOWED_REACTIONS = ['🔥', '😂', '👏', '😱', '🙏', '💯'];
const ALLOWED_CHATS = [
    'nice'     => 'Nice one! 👏',
    'close'    => 'So close! 😅',
    'bring_it' => 'Bring it on! 💪',
    'wow'      => 'Wow! 😲',
    'ggwp'     => 'Good game! 🤝',
    'oops'     => 'Oops! 🙈',
];

$input      = getInput();
$code       = trim($input['room_code'] ?? '');
$deviceId   = trim($input['device_id'] ?? '');
$type       = trim($input['type'] ?? '');
$payloadKey = trim($input['payload'] ?? '');

if (!$code || !$deviceId || !in_array($type, ['reaction', 'chat'], true)) {
    jsonOut(['success' => false, 'error' => 'Missing params'], 400);
}

$db = getDB();

$playerStmt = $db->prepare("SELECT name, avatar FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$player = $playerStmt->fetch();
if (!$player) jsonOut(['success' => false, 'error' => 'Not in room'], 403);

if ($type === 'reaction') {
    if (!in_array($payloadKey, ALLOWED_REACTIONS, true)) jsonOut(['success' => false, 'error' => 'Invalid reaction'], 400);
    $payload = $payloadKey;
} else {
    if (!isset(ALLOWED_CHATS[$payloadKey])) jsonOut(['success' => false, 'error' => 'Invalid message'], 400);
    $payload = ALLOWED_CHATS[$payloadKey];
}

$now = nowMs();
$db->prepare("INSERT INTO room_events (room_code, device_id, name, avatar, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
   ->execute([$code, $deviceId, $player['name'], $player['avatar'], $type, $payload, $now]);

// Bound table growth - this room's own old events are no longer needed
// by anyone once they've scrolled past the client's display window.
$db->prepare("DELETE FROM room_events WHERE room_code = ? AND created_at < ?")->execute([$code, $now - 120000]);

jsonOut(['success' => true]);
