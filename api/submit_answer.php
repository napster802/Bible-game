<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input     = getInput();
$code      = trim($input['room_code'] ?? '');
$deviceId  = trim($input['device_id'] ?? '');
$qIdx      = (int)($input['q_idx'] ?? -1);
$choiceIdx = (int)($input['choice_idx'] ?? -1);
$isCorrect = (bool)($input['is_correct'] ?? false);
$timeTaken = (float)($input['time_taken'] ?? 0);

if (!$code || !$deviceId || $qIdx < 0) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || !in_array($room['status'], ['playing', 'blitz_active', 'hs_question'], true)) jsonOut(['success' => false, 'error' => 'Not in playing state'], 400);

// Blitz has its own per-player question index flow
if ($room['status'] === 'blitz_active') {
    $playerStmt2 = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
    $playerStmt2->execute([$code, $deviceId]);
    $playerRow2 = $playerStmt2->fetch();
    if ($playerRow2 && (int)$playerRow2['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);

    $now = nowMs();
    $elapsed = $now - (int)$room['blitz_start_time'];
    $currentBlitzIdx = $playerRow2 ? (int)$playerRow2['blitz_q_idx'] : 0;
    if ($qIdx !== $currentBlitzIdx) jsonOut(['success' => false, 'error' => 'Wrong blitz question index'], 400);

    $points = 0;
    if ($isCorrect && $elapsed < 90000) {
        if ($elapsed < 30000)      $points = 50;   // easy tier
        elseif ($elapsed < 60000)  $points = 100;  // medium tier
        else                       $points = 200;  // hard tier
    }

    $newBlitzIdx = $currentBlitzIdx + 1;

    $db->beginTransaction();
    $db->prepare("INSERT OR IGNORE INTO answers (room_code, device_id, q_idx, choice_idx, is_correct, points, time_taken, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([$code, $deviceId, $qIdx, $choiceIdx, $isCorrect ? 1 : 0, $points, $timeTaken, $now]);
    if ($isCorrect) {
        $db->prepare("UPDATE players SET score = score + ?, correct_count = correct_count + 1, blitz_q_idx = ?, last_ping = ? WHERE room_code = ? AND device_id = ?")
           ->execute([$points, $newBlitzIdx, $now, $code, $deviceId]);
    } else {
        $db->prepare("UPDATE players SET wrong_count = wrong_count + 1, blitz_q_idx = ?, last_ping = ? WHERE room_code = ? AND device_id = ?")
           ->execute([$newBlitzIdx, $now, $code, $deviceId]);
    }
    $db->commit();

    jsonOut(['success' => true, 'points' => $points, 'is_correct' => $isCorrect, 'next_q_idx' => $newBlitzIdx]);
}

if ($room['status'] === 'hs_question') {
    // Only the current seater can answer
    $seatOrder = json_decode($room['hs_seat_order'], true) ?: [];
    $hsQCount  = max(1, (int)$room['hs_q_count']);
    $curQIdx   = (int)$room['current_q_idx'];
    if ($qIdx !== $curQIdx) jsonOut(['success' => false, 'error' => 'Wrong question index'], 400);
    $seatIdx  = (int)floor($curQIdx / $hsQCount) % max(1, count($seatOrder));
    $seaterId = $seatOrder[$seatIdx] ?? '';
    if ($deviceId !== $seaterId) jsonOut(['success' => false, 'error' => 'You are not in the Hot Seat'], 403);
    // Fall through to standard scoring below
}

if ((int)$room['current_q_idx'] !== $qIdx) jsonOut(['success' => false, 'error' => 'Wrong question index'], 400);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$playerRow = $playerStmt->fetch();
if ($playerRow && (int)$playerRow['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);
if ($playerRow && (int)$playerRow['eliminated'] === 1) jsonOut(['success' => false, 'error' => 'You have been eliminated'], 403);

// Anti-cheat: reject duplicate answers
$checkStmt = $db->prepare("SELECT 1 FROM answers WHERE room_code = ? AND device_id = ? AND q_idx = ?");
$checkStmt->execute([$code, $deviceId, $qIdx]);
if ($checkStmt->fetchColumn()) jsonOut(['success' => false, 'error' => 'Already answered'], 400);

$timeLimit = (int)$room['time_limit'];
$prevStreak = $playerRow ? (int)$playerRow['streak'] : 0;
$prevBestStreak = $playerRow ? (int)$playerRow['best_streak'] : 0;
// The Double Points power-up (use_powerup.php) stamps double_q_idx with the
// question it was bought for - it only pays off if that exact question is
// answered correctly, otherwise the gamble is lost.
$doubled = $isCorrect && $playerRow && (int)$playerRow['double_q_idx'] === $qIdx;

$points = 0;
$newStreak = 0;
if ($isCorrect) {
    $ratio = max(0.0, 1.0 - ($timeTaken / $timeLimit));
    $basePoints = 500 + 500 * $ratio;
    $newStreak = $prevStreak + 1;
    // +10% per streak level beyond the 2nd correct answer in a row, capped at +50%.
    $streakMultiplier = 1 + min(0.5, max(0, $newStreak - 2) * 0.1);
    $points = (int)round($basePoints * $streakMultiplier * ($doubled ? 2 : 1));
} elseif ($room['game_format'] === 'memory') {
    // Memory Match scores proportionally to pairs found even when the board
    // wasn't fully cleared, instead of the all-or-nothing rule every other
    // format uses - a half-finished board still deserves half credit.
    $totalPairs = max(1, (int)($input['total_pairs'] ?? 6));
    $pairsFound = max(0, min($totalPairs, $choiceIdx));
    $ratio = max(0.0, 1.0 - ($timeTaken / $timeLimit));
    $points = (int)round(($pairsFound / $totalPairs) * 500 * (1 + $ratio * 0.5));
}
$newBestStreak = max($prevBestStreak, $newStreak);

$now = nowMs();

$db->beginTransaction();

$db->prepare("INSERT OR IGNORE INTO answers (room_code, device_id, q_idx, choice_idx, is_correct, points, time_taken, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
   ->execute([$code, $deviceId, $qIdx, $choiceIdx, $isCorrect ? 1 : 0, $points, $timeTaken, $now]);

if ($isCorrect) {
    $db->prepare("UPDATE players SET score = score + ?, correct_count = correct_count + 1, total_time = total_time + ?, last_ping = ?, streak = ?, best_streak = ?, double_q_idx = -1 WHERE room_code = ? AND device_id = ?")
       ->execute([$points, $timeTaken, $now, $newStreak, $newBestStreak, $code, $deviceId]);
} else {
    // Sudden Death Survival: a single wrong answer eliminates the player
    // for the rest of the match - they keep spectating but never answer again.
    $eliminate = $room['game_format'] === 'survival' ? 1 : 0;
    $db->prepare("UPDATE players SET score = score + ?, wrong_count = wrong_count + 1, total_time = total_time + ?, last_ping = ?, streak = 0, double_q_idx = -1, eliminated = eliminated OR ? WHERE room_code = ? AND device_id = ?")
       ->execute([$points, $timeTaken, $now, $eliminate, $code, $deviceId]);
}

$db->commit();

jsonOut(['success' => true, 'points' => $points, 'is_correct' => $isCorrect, 'streak' => $newStreak, 'doubled' => $doubled]);
