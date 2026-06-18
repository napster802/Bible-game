<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$code     = trim($_GET['code'] ?? $_POST['code'] ?? '');
$deviceId = trim($_GET['device_id'] ?? $_POST['device_id'] ?? '');

if (!$code || !$deviceId) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

// Heartbeat
$db->prepare("UPDATE players SET last_ping = ? WHERE room_code = ? AND device_id = ?")
   ->execute([nowMs(), $code, $deviceId]);

markStalePlayers($db, $code);

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room) jsonOut(['success' => false, 'error' => 'Room not found'], 404);

$now = nowMs();
$status = $room['status'];
$timeLimitMs = (int)$room['time_limit'] * 1000;
$currentQIdx = (int)$room['current_q_idx'];

// === AUTO-ADVANCE: playing -> answer_reveal ===
if ($status === 'playing') {
    $elapsed = $now - (int)$room['q_start_time'];

    $totalStmt = $db->prepare("SELECT COUNT(*) FROM players WHERE room_code = ? AND is_host = 0");
    $totalStmt->execute([$code]);
    $totalPlayers = (int)$totalStmt->fetchColumn();

    $answeredStmt = $db->prepare("SELECT COUNT(*) FROM answers WHERE room_code = ? AND q_idx = ?");
    $answeredStmt->execute([$code, $currentQIdx]);
    $answeredCount = (int)$answeredStmt->fetchColumn();

    if ($elapsed >= $timeLimitMs + 2000 || ($totalPlayers > 0 && $answeredCount >= $totalPlayers)) {
        // Record 0-point timeouts for anyone who didn't answer (contestants only - the host never plays)
        $playerStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0");
        $playerStmt->execute([$code]);
        $allPlayers = $playerStmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($allPlayers as $pid) {
            $checkStmt = $db->prepare("SELECT 1 FROM answers WHERE room_code = ? AND device_id = ? AND q_idx = ?");
            $checkStmt->execute([$code, $pid, $currentQIdx]);
            if (!$checkStmt->fetchColumn()) {
                $db->prepare("INSERT OR IGNORE INTO answers (room_code, device_id, q_idx, choice_idx, is_correct, points, time_taken, submitted_at) VALUES (?, ?, ?, -1, 0, 0, ?, ?)")
                   ->execute([$code, $pid, $currentQIdx, (float)($timeLimitMs / 1000), nowMs()]);
                $db->prepare("UPDATE players SET wrong_count = wrong_count + 1 WHERE room_code = ? AND device_id = ?")
                   ->execute([$code, $pid]);
            }
        }

        $db->prepare("UPDATE rooms SET status = 'answer_reveal', updated_at = ? WHERE code = ?")
           ->execute([nowMs(), $code]);
        $status = 'answer_reveal';
        $room['updated_at'] = nowMs();
    }
}

// === AUTO-ADVANCE: answer_reveal -> leaderboard (after 5s) ===
if ($status === 'answer_reveal') {
    $revealElapsed = $now - (int)$room['updated_at'];
    if ($revealElapsed >= 5000) {
        $db->prepare("UPDATE rooms SET status = 'leaderboard', updated_at = ? WHERE code = ?")
           ->execute([nowMs(), $code]);
        $status = 'leaderboard';
    }
}

// Re-fetch fresh room row after any updates
$stmt2 = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt2->execute([$code]);
$room = $stmt2->fetch();
$status = $room['status'];
$currentQIdx = (int)$room['current_q_idx'];

// Players sorted by score
$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? ORDER BY score DESC, correct_count DESC");
$playerStmt->execute([$code]);
$players = $playerStmt->fetchAll();

$myPlayer = null;
foreach ($players as $p) {
    if ($p['device_id'] === $deviceId) { $myPlayer = $p; break; }
}
$isHost = $myPlayer && (int)$myPlayer['is_host'] === 1;

$qIndices = json_decode($room['q_indices'] ?? '[]', true) ?: [];
$qData = null;
$answerReveal = null;
$myAnswer = null;

if ($currentQIdx >= 0 && !empty($qIndices)) {
    $questionIndex = $qIndices[$currentQIdx] ?? 0;
    $qData = [
        'db_index'   => $questionIndex,
        'q_idx'      => $currentQIdx,
        'difficulty' => $room['difficulty']
    ];

    if (in_array($status, ['answer_reveal', 'leaderboard', 'finished'], true)) {
        $countCorrectStmt = $db->prepare("SELECT COUNT(*) FROM answers WHERE room_code = ? AND q_idx = ? AND is_correct = 1");
        $countCorrectStmt->execute([$code, $currentQIdx]);

        $totalAnsStmt = $db->prepare("SELECT COUNT(*) FROM answers WHERE room_code = ? AND q_idx = ?");
        $totalAnsStmt->execute([$code, $currentQIdx]);

        $answerReveal = [
            'reveal'         => true,
            'question_index' => $questionIndex,
            'correct_count'  => (int)$countCorrectStmt->fetchColumn(),
            'total_answers'  => (int)$totalAnsStmt->fetchColumn()
        ];
    }

    $myAnsStmt = $db->prepare("SELECT * FROM answers WHERE room_code = ? AND device_id = ? AND q_idx = ?");
    $myAnsStmt->execute([$code, $deviceId, $currentQIdx]);
    $myAns = $myAnsStmt->fetch();
    if ($myAns) {
        $myAnswer = [
            'choice_idx' => (int)$myAns['choice_idx'],
            'is_correct' => (bool)$myAns['is_correct'],
            'points'     => (int)$myAns['points'],
            'time_taken' => (float)$myAns['time_taken']
        ];
    }
}

$answeredNowStmt = $db->prepare("SELECT COUNT(*) FROM answers WHERE room_code = ? AND q_idx = ?");
$answeredNowStmt->execute([$code, $currentQIdx]);
$answeredCount = (int)$answeredNowStmt->fetchColumn();

$revealedNow = in_array($status, ['answer_reveal', 'leaderboard', 'finished'], true);

$playersOut = [];
foreach ($players as $p) {
    $hasAnswered = false;
    $isCorrectNow = null;
    if ($currentQIdx >= 0) {
        $stmt3 = $db->prepare("SELECT is_correct FROM answers WHERE room_code = ? AND device_id = ? AND q_idx = ?");
        $stmt3->execute([$code, $p['device_id'], $currentQIdx]);
        $ansRow = $stmt3->fetch();
        $hasAnswered = (bool)$ansRow;
        if ($ansRow && $revealedNow) $isCorrectNow = (bool)$ansRow['is_correct'];
    }
    $playersOut[] = [
        'device_id'    => $p['device_id'],
        'name'         => $p['name'],
        'avatar'       => $p['avatar'],
        'score'        => (int)$p['score'],
        'correct'      => (int)$p['correct_count'],
        'wrong'        => (int)$p['wrong_count'],
        'total_time'   => (float)$p['total_time'],
        'is_host'      => (bool)$p['is_host'],
        'has_answered' => $hasAnswered,
        'is_correct'   => $isCorrectNow
    ];
}

$contestantCount = 0;
foreach ($playersOut as $p) { if (!$p['is_host']) $contestantCount++; }

$timeElapsedMs = $status === 'playing' ? max(0, $now - (int)$room['q_start_time']) : 0;

jsonOut([
    'success' => true,
    'room' => [
        'code'            => $room['code'],
        'status'          => $status,
        'difficulty'      => $room['difficulty'],
        'question_count'  => (int)$room['question_count'],
        'current_q_idx'   => $currentQIdx,
        'time_limit'      => (int)$room['time_limit'],
        'time_elapsed_ms' => $timeElapsedMs,
        'q_indices_count' => count($qIndices)
    ],
    'players'           => $playersOut,
    'player_count'      => count($playersOut),
    'contestant_count'  => $contestantCount,
    'answered_count'    => $answeredCount,
    'current_question'  => $qData,
    'answer_reveal'     => $answerReveal,
    'my_answer'         => $myAnswer,
    'is_host'           => $isHost,
    'server_time'       => $now
]);
