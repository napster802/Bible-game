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
if (!$room || $room['status'] !== 'playing') jsonOut(['success' => false, 'error' => 'Not in playing state'], 400);
if ((int)$room['current_q_idx'] !== $qIdx) jsonOut(['success' => false, 'error' => 'Wrong question index'], 400);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$playerRow = $playerStmt->fetch();
if ($playerRow && (int)$playerRow['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);

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
    $db->prepare("UPDATE players SET wrong_count = wrong_count + 1, total_time = total_time + ?, last_ping = ?, streak = 0, double_q_idx = -1 WHERE room_code = ? AND device_id = ?")
       ->execute([$timeTaken, $now, $code, $deviceId]);
}

$db->commit();

jsonOut(['success' => true, 'points' => $points, 'is_correct' => $isCorrect, 'streak' => $newStreak, 'doubled' => $doubled]);
