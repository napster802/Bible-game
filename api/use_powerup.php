<?php
/* ------------------------------------------------------------
   In-game power-ups, paid for with the player's persistent
   wallet (the same currency the Shop uses). Each power-up can
   only be used once per game, tracked via players.used_powerups
   for the current room - a brand new room (new game) always
   starts with a fresh players row, so nothing needs resetting.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

const POWERUP_COSTS = [
    'fifty'  => 800,
    'double' => 1500,
    'freeze' => 1000,
    'steal'  => 2000,
];
const FREEZE_MS = 5000;
const STEAL_PERCENT = 0.15;

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$powerup  = trim($input['powerup'] ?? '');
$targetId = trim($input['target_device_id'] ?? '');

if (!$code || !$deviceId || !$powerup) jsonOut(['success' => false, 'error' => 'Missing params'], 400);
if (!isset(POWERUP_COSTS[$powerup])) jsonOut(['success' => false, 'error' => 'Unknown power-up'], 400);

$db = getDB();

$roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$roomStmt->execute([$code]);
$room = $roomStmt->fetch();
if (!$room) jsonOut(['success' => false, 'error' => 'Room not found'], 404);
if ($room['status'] !== 'playing') jsonOut(['success' => false, 'error' => 'Power-ups can only be used while a question is active'], 400);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$player = $playerStmt->fetch();
if (!$player || (int)$player['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);
if ((int)$player['eliminated'] === 1) jsonOut(['success' => false, 'error' => 'You have been eliminated'], 403);

$used = json_decode($player['used_powerups'] ?: '[]', true) ?: [];
if (in_array($powerup, $used, true)) jsonOut(['success' => false, 'error' => 'You already used this power-up this game'], 400);

$qIdx = (int)$room['current_q_idx'];

if ($powerup === 'fifty' || $powerup === 'double') {
    $checkStmt = $db->prepare("SELECT 1 FROM answers WHERE room_code = ? AND device_id = ? AND q_idx = ?");
    $checkStmt->execute([$code, $deviceId, $qIdx]);
    if ($checkStmt->fetchColumn()) jsonOut(['success' => false, 'error' => 'You already answered this question'], 400);
}

$profileStmt = $db->prepare("SELECT wallet FROM profiles WHERE device_id = ?");
$profileStmt->execute([$deviceId]);
$wallet = (int)$profileStmt->fetchColumn();
$cost = POWERUP_COSTS[$powerup];
if ($wallet < $cost) {
    jsonOut(['success' => false, 'error' => "You need " . number_format($cost) . " points for this. You have " . number_format($wallet) . "."], 400);
}

$leader = null;
$stealAmount = 0;
if ($powerup === 'steal') {
    $leaderStmt = $db->prepare("SELECT device_id, name, score FROM players WHERE room_code = ? AND is_host = 0 ORDER BY score DESC, correct_count DESC LIMIT 1");
    $leaderStmt->execute([$code]);
    $leader = $leaderStmt->fetch();
    if (!$leader || $leader['device_id'] === $deviceId) jsonOut(['success' => false, 'error' => 'You are already the leader'], 400);
    $stealAmount = (int)round($leader['score'] * STEAL_PERCENT);
    if ($stealAmount <= 0) jsonOut(['success' => false, 'error' => 'The leader has no points to steal'], 400);
}

if ($powerup === 'freeze' && !$targetId) jsonOut(['success' => false, 'error' => 'No target chosen'], 400);
if ($powerup === 'freeze') {
    $targetStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ? AND is_host = 0");
    $targetStmt->execute([$code, $targetId]);
    if (!$targetStmt->fetch()) jsonOut(['success' => false, 'error' => 'Target not found'], 404);
}

$now = nowMs();
$db->beginTransaction();

$db->prepare("UPDATE profiles SET wallet = wallet - ?, updated_at = ? WHERE device_id = ?")
   ->execute([$cost, $now, $deviceId]);

$used[] = $powerup;
$db->prepare("UPDATE players SET used_powerups = ? WHERE room_code = ? AND device_id = ?")
   ->execute([json_encode($used), $code, $deviceId]);

if ($powerup === 'double') {
    $db->prepare("UPDATE players SET double_q_idx = ? WHERE room_code = ? AND device_id = ?")
       ->execute([$qIdx, $code, $deviceId]);
} elseif ($powerup === 'freeze') {
    $db->prepare("UPDATE players SET frozen_until = ? WHERE room_code = ? AND device_id = ?")
       ->execute([$now + FREEZE_MS, $code, $targetId]);
} elseif ($powerup === 'steal') {
    $db->prepare("UPDATE players SET score = score - ? WHERE room_code = ? AND device_id = ?")
       ->execute([$stealAmount, $code, $leader['device_id']]);
    $db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
       ->execute([$stealAmount, $code, $deviceId]);
    $db->prepare("INSERT INTO room_events (room_code, device_id, name, avatar, type, payload, created_at) VALUES (?, ?, ?, ?, 'steal', ?, ?)")
       ->execute([$code, $deviceId, $player['name'], $player['avatar'], json_encode([
           'thief'  => $player['name'],
           'victim' => $leader['name'],
           'amount' => $stealAmount
       ]), $now]);
}

$db->commit();

$newWalletStmt = $db->prepare("SELECT wallet FROM profiles WHERE device_id = ?");
$newWalletStmt->execute([$deviceId]);
$newWallet = (int)$newWalletStmt->fetchColumn();

jsonOut([
    'success'      => true,
    'wallet'       => $newWallet,
    'powerup'      => $powerup,
    'steal_amount' => $powerup === 'steal' ? $stealAmount : null
]);
