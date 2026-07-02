<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$qIdx     = (int)($input['q_idx'] ?? -1);
$betCorrect = (bool)($input['bet_correct'] ?? false);

if (!$code || !$deviceId || $qIdx < 0) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$roomStmt->execute([$code]);
$room = $roomStmt->fetch();
if (!$room || $room['status'] !== 'hs_question') jsonOut(['success' => false, 'error' => 'Not in hot seat question phase'], 400);
if ((int)$room['current_q_idx'] !== $qIdx) jsonOut(['success' => false, 'error' => 'Wrong question index'], 400);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$player = $playerStmt->fetch();
if (!$player || (int)$player['is_host'] === 1) jsonOut(['success' => false, 'error' => 'Host cannot bet'], 403);

// Determine current seater
$seatOrder = json_decode($room['hs_seat_order'], true) ?: [];
$hsQCount  = max(1, (int)$room['hs_q_count']);
$seatIdx   = (int)floor($qIdx / $hsQCount) % max(1, count($seatOrder));
$seaterId  = $seatOrder[$seatIdx] ?? '';

if ($deviceId === $seaterId) jsonOut(['success' => false, 'error' => 'You are in the Hot Seat — answer, don\'t bet!'], 403);

$now = nowMs();
$db->prepare("INSERT OR IGNORE INTO hs_bets (room_code, seater_id, bettor_id, q_idx, bet_correct, created_at) VALUES (?, ?, ?, ?, ?, ?)")
   ->execute([$code, $seaterId, $deviceId, $qIdx, $betCorrect ? 1 : 0, $now]);

jsonOut(['success' => true, 'bet_correct' => $betCorrect]);
