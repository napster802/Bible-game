<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$code        = trim($_GET['code'] ?? $_POST['code'] ?? '');
$deviceId    = trim($_GET['device_id'] ?? $_POST['device_id'] ?? '');
$sinceEventId = (int)($_GET['since_event_id'] ?? $_POST['since_event_id'] ?? 0);

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

    // Eliminated survivors never submit again, so the round can advance as
    // soon as every player who is still alive has answered this question -
    // including the instant the last alive player answers and is eliminated
    // by that very answer (a naive "alive count > 0" guard would block that
    // case, since the alive count is already 0 by the time we check it here).
    $contestantStmt = $db->prepare("SELECT COUNT(*) FROM players WHERE room_code = ? AND is_host = 0");
    $contestantStmt->execute([$code]);
    $contestantCount = (int)$contestantStmt->fetchColumn();

    $waitingStmt = $db->prepare("SELECT COUNT(*) FROM players p WHERE p.room_code = ? AND p.is_host = 0 AND p.eliminated = 0
                                  AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.room_code = p.room_code AND a.device_id = p.device_id AND a.q_idx = ?)");
    $waitingStmt->execute([$code, $currentQIdx]);
    $stillWaiting = (int)$waitingStmt->fetchColumn();

    if ($elapsed >= $timeLimitMs + 2000 || ($contestantCount > 0 && $stillWaiting === 0)) {
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
                // A timeout is as final as a wrong answer in Sudden Death Survival.
                $eliminate = $room['game_format'] === 'survival' ? 1 : 0;
                $db->prepare("UPDATE players SET wrong_count = wrong_count + 1, streak = CASE WHEN ? = 1 THEN 0 ELSE streak END, eliminated = eliminated OR ? WHERE room_code = ? AND device_id = ?")
                   ->execute([$eliminate, $eliminate, $code, $pid]);
            }
        }

        // Sudden Death Survival ends the instant every contestant is out -
        // no point waiting out the remaining rounds with nobody left to play.
        $aliveStmt = $db->prepare("SELECT COUNT(*) FROM players WHERE room_code = ? AND is_host = 0 AND eliminated = 0");
        $aliveStmt->execute([$code]);
        $aliveCount = (int)$aliveStmt->fetchColumn();

        if ($room['game_format'] === 'survival' && $aliveCount === 0 && $contestantCount > 0) {
            $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")
               ->execute([nowMs(), $code]);
            $status = 'finished';
        } else {
            $db->prepare("UPDATE rooms SET status = 'answer_reveal', updated_at = ? WHERE code = ?")
               ->execute([nowMs(), $code]);
            $status = 'answer_reveal';
        }
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

// === WALLET CREDITING: finished -> award points once, server-side only ===
// Points are only ever credited here, from a completed multiplayer room,
// never from solo/local play, and the points_awarded flag makes this
// idempotent no matter how many clients poll after the room finishes.
if ($status === 'finished' && (int)$room['points_awarded'] === 0) {
    $creditStmt = $db->prepare("SELECT device_id, score FROM players WHERE room_code = ? AND is_host = 0");
    $creditStmt->execute([$code]);
    $toCredit = $creditStmt->fetchAll();

    $db->beginTransaction();
    foreach ($toCredit as $pc) {
        $score = (int)$pc['score'];
        if ($score <= 0) continue;
        $db->prepare("INSERT INTO profiles (device_id, name, avatar, wallet, updated_at) VALUES (?, '', '', ?, ?)
                      ON CONFLICT(device_id) DO UPDATE SET wallet = wallet + excluded.wallet, updated_at = excluded.updated_at")
           ->execute([$pc['device_id'], $score, nowMs()]);
    }
    $db->prepare("UPDATE rooms SET points_awarded = 1 WHERE code = ?")->execute([$code]);
    $db->commit();

    $room['points_awarded'] = 1;
}

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

        $distStmt = $db->prepare("SELECT choice_idx, COUNT(*) AS cnt FROM answers WHERE room_code = ? AND q_idx = ? GROUP BY choice_idx");
        $distStmt->execute([$code, $currentQIdx]);
        $distribution = [0, 0, 0, 0];
        foreach ($distStmt->fetchAll() as $row) {
            $idx = (int)$row['choice_idx'];
            if ($idx >= 0 && $idx <= 3) $distribution[$idx] = (int)$row['cnt'];
        }

        $answerReveal = [
            'reveal'         => true,
            'question_index' => $questionIndex,
            'correct_count'  => (int)$countCorrectStmt->fetchColumn(),
            'total_answers'  => (int)$totalAnsStmt->fetchColumn(),
            'distribution'   => $distribution
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
        'is_correct'   => $isCorrectNow,
        'streak'       => (int)$p['streak'],
        'best_streak'  => (int)$p['best_streak'],
        'frozen'       => ((int)$p['frozen_until']) > $now,
        'eliminated'   => (bool)$p['eliminated']
    ];
}

$contestantCount = 0;
foreach ($playersOut as $p) { if (!$p['is_host']) $contestantCount++; }

$timeElapsedMs = $status === 'playing' ? max(0, $now - (int)$room['q_start_time']) : 0;

$myWalletStmt = $db->prepare("SELECT wallet FROM profiles WHERE device_id = ?");
$myWalletStmt->execute([$deviceId]);
$myWalletCol = $myWalletStmt->fetchColumn();
$myWallet = $myWalletCol === false ? null : (int)$myWalletCol;

$myUsedPowerups = $myPlayer ? (json_decode($myPlayer['used_powerups'] ?: '[]', true) ?: []) : [];
$myFrozenUntil = $myPlayer ? (int)$myPlayer['frozen_until'] : 0;

// Live reactions / quick-chat / steal announcements, broadcast to everyone
// polling this room. since_event_id=0 (a fresh join) only returns the last
// few seconds of backlog so new joiners aren't flooded with old reactions.
if ($sinceEventId > 0) {
    $eventsStmt = $db->prepare("SELECT * FROM room_events WHERE room_code = ? AND id > ? ORDER BY id ASC LIMIT 20");
    $eventsStmt->execute([$code, $sinceEventId]);
} else {
    $eventsStmt = $db->prepare("SELECT * FROM room_events WHERE room_code = ? AND created_at > ? ORDER BY id ASC LIMIT 20");
    $eventsStmt->execute([$code, $now - 4000]);
}
$eventsOut = array_map(fn($e) => [
    'id'        => (int)$e['id'],
    'device_id' => $e['device_id'],
    'name'      => $e['name'],
    'avatar'    => $e['avatar'],
    'type'      => $e['type'],
    'payload'   => $e['payload']
], $eventsStmt->fetchAll());

jsonOut([
    'success' => true,
    'room' => [
        'code'            => $room['code'],
        'status'          => $status,
        'difficulty'      => $room['difficulty'],
        'quiz_mode'       => $room['quiz_mode'],
        'book'            => $room['book'],
        'category'        => $room['category'],
        'testament'       => $room['testament'],
        'game_format'     => $room['game_format'] ?: 'classic',
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
    'my_wallet'         => $myWallet,
    'my_used_powerups'  => $myUsedPowerups,
    'my_frozen_until'   => $myFrozenUntil,
    'events'            => $eventsOut,
    'server_time'       => $now
]);
