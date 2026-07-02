<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input      = getInput();
$code       = trim($input['room_code'] ?? '');
$deviceId   = trim($input['device_id'] ?? '');
$qIdx       = (int)($input['q_idx'] ?? -1);
$betCorrect = (bool)($input['bet_correct'] ?? false);
$betPct     = max(1, min(10, (int)($input['bet_pct'] ?? 5))); // 1-10%

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

// Get current wallet balance to compute bet amount
$walletStmt = $db->prepare("SELECT wallet FROM profiles WHERE device_id = ?");
$walletStmt->execute([$deviceId]);
$walletRow = $walletStmt->fetch();
$wallet    = $walletRow ? max(0, (int)$walletRow['wallet']) : 0;

// Compute bet amount: betPct% of wallet, minimum 1 if wallet allows
$betAmount = 0;
if ($wallet > 0) {
    $betAmount = max(1, (int)floor($wallet * $betPct / 100));
    $betAmount = min($betAmount, $wallet); // never bet more than you have

    // Deduct from wallet immediately (INSERT OR IGNORE below will prevent
    // double-betting so wallet can only be deducted once per question)
    $deducted = $db->prepare("UPDATE profiles SET wallet = wallet - ? WHERE device_id = ? AND wallet >= ?");
    $deducted->execute([$betAmount, $deviceId, $betAmount]);
    if ($deducted->rowCount() === 0) {
        // Wallet changed between read and update (shouldn't happen normally)
        $betAmount = 0;
    }
}

$now = nowMs();
$inserted = $db->prepare("INSERT OR IGNORE INTO hs_bets (room_code, seater_id, bettor_id, q_idx, bet_correct, bet_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
$inserted->execute([$code, $seaterId, $deviceId, $qIdx, $betCorrect ? 1 : 0, $betAmount, $now]);

// If INSERT was ignored (duplicate), refund any deducted coins
if ($inserted->rowCount() === 0 && $betAmount > 0) {
    $db->prepare("UPDATE profiles SET wallet = wallet + ? WHERE device_id = ?")->execute([$betAmount, $deviceId]);
    $betAmount = 0;
}

jsonOut(['success' => true, 'bet_correct' => $betCorrect, 'bet_amount' => $betAmount]);
