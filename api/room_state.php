<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$code        = trim($_GET['code'] ?? $_POST['code'] ?? '');
$deviceId    = trim($_GET['device_id'] ?? $_POST['device_id'] ?? '');
$sinceEventId = (int)($_GET['since_event_id'] ?? $_POST['since_event_id'] ?? 0);
$sinceStrokeId = (int)($_GET['since_stroke_id'] ?? $_POST['since_stroke_id'] ?? 0);

if (!$code || !$deviceId) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

// Heartbeat
$db->prepare("UPDATE players SET last_ping = ? WHERE room_code = ? AND device_id = ?")
   ->execute([nowMs(), $code, $deviceId]);

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room) jsonOut(['success' => false, 'error' => 'Room not found'], 404);

// Dropping AFK players only makes sense while still in the lobby (people who
// joined and wandered off before the host started). Once a match is running,
// a player who misses pings for 30s (backgrounded tab, flaky wifi) must not
// be permanently ejected mid-game - they should just catch up on their next poll.
if ($room['status'] === 'lobby') {
    markStalePlayers($db, $code);
}

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
        // Record 0-point timeouts for anyone who didn't answer (contestants only - the host never plays).
        // Single NOT EXISTS query instead of a per-player SELECT round-trip - under
        // concurrent answer submissions, fewer queries per poll means a smaller window
        // for SQLite's busy_timeout to actually get exercised.
        $missingStmt = $db->prepare("SELECT p.device_id FROM players p WHERE p.room_code = ? AND p.is_host = 0
                                      AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.room_code = p.room_code AND a.device_id = p.device_id AND a.q_idx = ?)");
        $missingStmt->execute([$code, $currentQIdx]);
        $missingPlayers = $missingStmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($missingPlayers as $pid) {
            $db->prepare("INSERT OR IGNORE INTO answers (room_code, device_id, q_idx, choice_idx, is_correct, points, time_taken, submitted_at) VALUES (?, ?, ?, -1, 0, 0, ?, ?)")
               ->execute([$code, $pid, $currentQIdx, (float)($timeLimitMs / 1000), nowMs()]);
            // A timeout is as final as a wrong answer in Sudden Death Survival.
            $eliminate = $room['game_format'] === 'survival' ? 1 : 0;
            $db->prepare("UPDATE players SET wrong_count = wrong_count + 1, streak = CASE WHEN ? = 1 THEN 0 ELSE streak END, eliminated = eliminated OR ? WHERE room_code = ? AND device_id = ?")
               ->execute([$eliminate, $eliminate, $code, $pid]);
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

// === AUTO-ADVANCE: imp_clue -> imp_reveal (Word Impostor, no timer) ===
// Every other format falls back to a time limit; Word Impostor has none,
// so this round only ever ends once every alive contestant has submitted
// a clue - the host's force_advance action is the only other way past it.
if ($status === 'imp_clue') {
    $impRound = (int)$room['impostor_round'];
    $aliveIds = impostorAliveContestants($db, $code);
    if (!empty($aliveIds)) {
        $placeholders = implode(',', array_fill(0, count($aliveIds), '?'));
        $cluedStmt = $db->prepare("SELECT COUNT(*) FROM impostor_clues WHERE room_code = ? AND round = ? AND device_id IN ($placeholders)");
        $cluedStmt->execute(array_merge([$code, $impRound], $aliveIds));
        if ((int)$cluedStmt->fetchColumn() >= count($aliveIds)) {
            $db->prepare("UPDATE rooms SET status = 'imp_reveal', updated_at = ? WHERE code = ?")->execute([nowMs(), $code]);
            $status = 'imp_reveal';
        }
    }
}

// Voting never auto-resolves, even once everyone has voted - the host must
// explicitly press Proceed (host_action.php's impostor_force_advance case)
// so everyone gets a moment to see the final vote land before moving on.

// === AUTO-ADVANCE: draw_active -> draw_reveal (Sketch & Guess) ===
// Ends as soon as either the round timer runs out or the first 3 correct
// guessers have already been recorded - no point dragging out a round
// everyone capable of scoring has already finished.
if ($status === 'draw_active') {
    $drawElapsed = $now - (int)$room['draw_round_start_time'];
    $correctStmt = $db->prepare("SELECT COUNT(*) FROM drawing_guesses WHERE room_code = ? AND round = ? AND is_correct = 1");
    $correctStmt->execute([$code, (int)$room['draw_round']]);
    $correctCount = (int)$correctStmt->fetchColumn();
    if ($drawElapsed >= DRAW_ROUND_TIME_LIMIT * 1000 || $correctCount >= 3) {
        finishDrawRound($db, $code);
        $status = 'draw_reveal';
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
        // Lifetime leaderboard total, kept separate from the spendable wallet
        // above so shop purchases never lower a player's Hall of Fame rank.
        $db->prepare("INSERT INTO leaderboard_stats (device_id, game_format, total_points, updated_at) VALUES (?, ?, ?, ?)
                      ON CONFLICT(device_id, game_format) DO UPDATE SET total_points = total_points + excluded.total_points, updated_at = excluded.updated_at")
           ->execute([$pc['device_id'], $room['game_format'], $score, nowMs()]);
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
$impRound = (int)$room['impostor_round'];

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

    // Word Impostor reuses the host-monitor "has acted this round" concept
    // for clue submission / voting, instead of the answers table.
    $impostorActed = false;
    if ($room['game_format'] === 'impostor') {
        if ($status === 'imp_clue') {
            $actedStmt = $db->prepare("SELECT 1 FROM impostor_clues WHERE room_code = ? AND device_id = ? AND round = ?");
            $actedStmt->execute([$code, $p['device_id'], $impRound]);
            $impostorActed = (bool)$actedStmt->fetchColumn();
        } elseif ($status === 'imp_vote') {
            $actedStmt = $db->prepare("SELECT 1 FROM impostor_votes WHERE room_code = ? AND device_id = ? AND round = ?");
            $actedStmt->execute([$code, $p['device_id'], $impRound]);
            $impostorActed = (bool)$actedStmt->fetchColumn();
        }
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
        'eliminated'   => (bool)$p['eliminated'],
        'impostor_acted' => $impostorActed
    ];
}

$contestantCount = 0;
foreach ($playersOut as $p) { if (!$p['is_host']) $contestantCount++; }

$impostorAliveCount = 0;
foreach ($playersOut as $p) { if (!$p['is_host'] && !$p['eliminated']) $impostorAliveCount++; }

$timeElapsedMs = $status === 'playing' ? max(0, $now - (int)$room['q_start_time']) : 0;

// === WORD IMPOSTOR: per-device role + reveal-gated clues/votes ===
$amIImpostor = false;
$impostorClueCount = 0;
$impostorVoteCount = 0;
$impostorClues = [];
$impostorVoteTally = [];
$impostorLastElim = null;
$impostorReveal = null;
$myImpostorClue = null;
$myImpostorVote = null;
$impostorCrewList = null;
$impostorImpostorList = null;

if ($room['game_format'] === 'impostor') {
    $impostorIds = impostorIdsOf($room);
    $amIImpostor = in_array($deviceId, $impostorIds, true);

    if ($isHost) {
        $impostorCrewList = [];
        $impostorImpostorList = [];
        foreach ($playersOut as $p) {
            if ($p['is_host']) continue;
            $entry = ['device_id' => $p['device_id'], 'name' => $p['name'], 'avatar' => $p['avatar'], 'eliminated' => $p['eliminated']];
            if (in_array($p['device_id'], $impostorIds, true)) $impostorImpostorList[] = $entry;
            else $impostorCrewList[] = $entry;
        }
    }

    $clueCountStmt = $db->prepare("SELECT COUNT(*) FROM impostor_clues WHERE room_code = ? AND round = ?");
    $clueCountStmt->execute([$code, $impRound]);
    $impostorClueCount = (int)$clueCountStmt->fetchColumn();

    $voteCountStmt = $db->prepare("SELECT COUNT(*) FROM impostor_votes WHERE room_code = ? AND round = ?");
    $voteCountStmt->execute([$code, $impRound]);
    $impostorVoteCount = (int)$voteCountStmt->fetchColumn();

    $myClueStmt = $db->prepare("SELECT clue FROM impostor_clues WHERE room_code = ? AND device_id = ? AND round = ?");
    $myClueStmt->execute([$code, $deviceId, $impRound]);
    $myClueVal = $myClueStmt->fetchColumn();
    $myImpostorClue = $myClueVal !== false ? $myClueVal : null;

    $myVoteStmt = $db->prepare("SELECT target_device_id FROM impostor_votes WHERE room_code = ? AND device_id = ? AND round = ?");
    $myVoteStmt->execute([$code, $deviceId, $impRound]);
    $myVoteVal = $myVoteStmt->fetchColumn();
    $myImpostorVote = $myVoteVal !== false ? $myVoteVal : null;

    // Clues stay hidden from everyone until every alive contestant has
    // submitted one (imp_reveal), then stay visible through voting/elimination
    // so players can keep re-reading them while they discuss/vote.
    if (in_array($status, ['imp_reveal', 'imp_vote', 'imp_tiebreak', 'imp_elim', 'finished'], true)) {
        $cluesStmt = $db->prepare("SELECT ic.device_id, p.name, p.avatar, ic.clue FROM impostor_clues ic
                                    JOIN players p ON p.room_code = ic.room_code AND p.device_id = ic.device_id
                                    WHERE ic.room_code = ? AND ic.round = ? ORDER BY ic.submitted_at ASC");
        $cluesStmt->execute([$code, $impRound]);
        $impostorClues = $cluesStmt->fetchAll();
    }

    // Vote tallies stay hidden during voting itself (no live bias) and only
    // surface once a round has actually resolved.
    if (in_array($status, ['imp_tiebreak', 'imp_elim', 'finished'], true)) {
        $tallyStmt = $db->prepare("SELECT iv.target_device_id, p.name, p.avatar, COUNT(*) AS cnt FROM impostor_votes iv
                                    JOIN players p ON p.room_code = iv.room_code AND p.device_id = iv.target_device_id
                                    WHERE iv.room_code = ? AND iv.round = ? GROUP BY iv.target_device_id ORDER BY cnt DESC");
        $tallyStmt->execute([$code, $impRound]);
        $impostorVoteTally = $tallyStmt->fetchAll();
    }

    if (in_array($status, ['imp_elim', 'finished'], true) && $room['impostor_last_elim_id']) {
        $lastElimStmt = $db->prepare("SELECT device_id, name, avatar FROM players WHERE room_code = ? AND device_id = ?");
        $lastElimStmt->execute([$code, $room['impostor_last_elim_id']]);
        $lastElimRow = $lastElimStmt->fetch();
        if ($lastElimRow) {
            $impostorLastElim = [
                'device_id'    => $lastElimRow['device_id'],
                'name'         => $lastElimRow['name'],
                'avatar'       => $lastElimRow['avatar'],
                'was_impostor' => in_array($lastElimRow['device_id'], $impostorIds, true)
            ];
        }
    }

    // The game has ended either way by 'finished' - safe to reveal who the
    // impostor(s) actually were, even if one survived uncaught (in which
    // case impostor_last_elim above points at an innocent crew member instead).
    if ($status === 'finished' && !empty($impostorIds)) {
        $placeholders = implode(',', array_fill(0, count($impostorIds), '?'));
        $revealStmt = $db->prepare("SELECT device_id, name, avatar FROM players WHERE room_code = ? AND device_id IN ($placeholders)");
        $revealStmt->execute(array_merge([$code], $impostorIds));
        $impostorReveal = array_map(fn($r) => [
            'device_id' => $r['device_id'],
            'name'      => $r['name'],
            'avatar'    => $r['avatar']
        ], $revealStmt->fetchAll());
    }
}

// === SKETCH & GUESS: per-device drawer/word visibility + live guesses/strokes ===
$drawCurrentDrawer = null;
$amIDrawer = false;
$myDrawWordChoices = null;
$drawWordIdx = null;
$drawGuesses = [];
$drawGuessLog = [];
$drawMyGuessedCorrectly = false;
$drawTurnNumber = 0;
$drawTotalTurns = 0;
$drawStrokes = [];

if ($room['game_format'] === 'draw') {
    $drawRound = (int)$room['draw_round'];
    $turnOrder = drawTurnOrderOf($room);
    $drawerId = currentDrawerId($room);
    $amIDrawer = $drawerId !== null && $drawerId === $deviceId;
    $drawTurnNumber = $drawRound;
    $drawTotalTurns = count($turnOrder) * max(1, (int)$room['draw_rounds_total']);

    if ($drawerId) {
        foreach ($playersOut as $p) {
            if ($p['device_id'] === $drawerId) {
                $drawCurrentDrawer = ['device_id' => $p['device_id'], 'name' => $p['name'], 'avatar' => $p['avatar']];
                break;
            }
        }
    }

    if ($status === 'draw_choose' && $amIDrawer) {
        $myDrawWordChoices = json_decode($room['draw_word_choice_indices'], true) ?: [];
    }

    // The word index is only meaningful (and worth sending) to the drawer
    // while choosing/drawing, and to everyone once it's actually revealed -
    // mid-round guessers must not see it early just because they polled the host.
    if ((int)$room['draw_word_idx'] >= 0 && ($amIDrawer || $isHost || $status === 'draw_reveal')) {
        $drawWordIdx = (int)$room['draw_word_idx'];
    }

    if (in_array($status, ['draw_active', 'draw_reveal'], true)) {
        $guessStmt = $db->prepare("SELECT dg.device_id, p.name, p.avatar, dg.rank FROM drawing_guesses dg
                                    JOIN players p ON p.room_code = dg.room_code AND p.device_id = dg.device_id
                                    WHERE dg.room_code = ? AND dg.round = ? AND dg.is_correct = 1 ORDER BY dg.rank ASC");
        $guessStmt->execute([$code, $drawRound]);
        $drawGuesses = $guessStmt->fetchAll();
        foreach ($drawGuesses as $g) {
            if ($g['device_id'] === $deviceId) { $drawMyGuessedCorrectly = true; break; }
        }
    }

    if ($status === 'draw_active') {
        // Chat-style feed of every guess attempt this round. Correct guesses
        // are masked with asterisks server-side - even though the guesser who
        // submitted it already knows the word, broadcasting it in the clear
        // to everyone else still guessing would spoil the round for them.
        $logStmt = $db->prepare("SELECT dgl.guess_text, dgl.is_correct, p.device_id, p.name, p.avatar FROM drawing_guess_log dgl
                                  JOIN players p ON p.room_code = dgl.room_code AND p.device_id = dgl.device_id
                                  WHERE dgl.room_code = ? AND dgl.round = ? ORDER BY dgl.id ASC LIMIT 200");
        $logStmt->execute([$code, $drawRound]);
        $drawGuessLog = array_map(function ($g) {
            $isCorrectGuess = (int)$g['is_correct'] === 1;
            return [
                'device_id'  => $g['device_id'],
                'name'       => $g['name'],
                'avatar'     => $g['avatar'],
                'is_correct' => $isCorrectGuess,
                'text'       => $isCorrectGuess ? str_repeat('*', max(3, mb_strlen($g['guess_text']))) : $g['guess_text'],
            ];
        }, $logStmt->fetchAll());

        if ($sinceStrokeId > 0) {
            $strokeStmt = $db->prepare("SELECT * FROM drawing_strokes WHERE room_code = ? AND round = ? AND id > ? ORDER BY id ASC LIMIT 200");
            $strokeStmt->execute([$code, $drawRound, $sinceStrokeId]);
        } else {
            $strokeStmt = $db->prepare("SELECT * FROM drawing_strokes WHERE room_code = ? AND round = ? ORDER BY id ASC LIMIT 500");
            $strokeStmt->execute([$code, $drawRound]);
        }
        $drawStrokes = array_map(fn($s) => [
            'id'         => (int)$s['id'],
            'points'     => json_decode($s['points'], true) ?: [],
            'color'      => $s['color'],
            'line_width' => (int)$s['line_width']
        ], $strokeStmt->fetchAll());
    } elseif ($status === 'draw_reveal') {
        // The reveal screen needs the complete picture in one shot rather than
        // a cursor-based trickle, since by now the round is over and there's
        // no "new since last poll" framing left - every client just fetches it once.
        $strokeStmt = $db->prepare("SELECT * FROM drawing_strokes WHERE room_code = ? AND round = ? ORDER BY id ASC LIMIT 500");
        $strokeStmt->execute([$code, $drawRound]);
        $drawStrokes = array_map(fn($s) => [
            'id'         => (int)$s['id'],
            'points'     => json_decode($s['points'], true) ?: [],
            'color'      => $s['color'],
            'line_width' => (int)$s['line_width']
        ], $strokeStmt->fetchAll());
    }
}

// === BIBLE SCRABBLE state ===
$scrabBoard         = null;
$myScrabRack        = null;
$scrabCurrentPlayer = null;
$amIScrabTurn       = false;
$scrabTilesInBag    = 0;
$scrabRecentPlays   = [];
$scrabTimeLimit     = 90;
$scrabTurnElapsedMs = 0;
$scrabWordResult    = null;

if (in_array($room['game_format'], ['scrab'], true) && in_array($status, ['scrab_place', 'scrab_word_result'], true)) {
    require_once __DIR__ . '/scrabble_words.php';

    $scrabBoard      = json_decode($room['scrab_board'] ?? '[]', true) ?: array_fill(0, 121, null);
    $bag             = json_decode($room['scrab_bag'] ?? '[]', true) ?: [];
    $scrabTilesInBag = count($bag);
    $scrabTimeLimit  = (int)($room['scrab_time_limit'] ?? 90);

    // Send each player only their own private rack
    $rackStmt = $db->prepare("SELECT scrab_rack FROM players WHERE room_code = ? AND device_id = ?");
    $rackStmt->execute([$code, $deviceId]);
    $myScrabRack = json_decode($rackStmt->fetchColumn() ?: '[]', true) ?: [];

    $currentScrabId = scrabCurrentPlayerId($room);
    $amIScrabTurn   = $currentScrabId === $deviceId;

    if ($currentScrabId) {
        foreach ($playersOut as $p) {
            if ($p['device_id'] === $currentScrabId) {
                $scrabCurrentPlayer = ['device_id' => $p['device_id'], 'name' => $p['name'], 'avatar' => $p['avatar']];
                break;
            }
        }
    }

    $scrabTurnElapsedMs = $now - (int)$room['scrab_turn_start_time'];

    // Recent plays feed (last 20)
    $playsStmt = $db->prepare("SELECT sp.*, p.name, p.avatar FROM scrab_plays sp JOIN players p ON p.room_code = sp.room_code AND p.device_id = sp.device_id WHERE sp.room_code = ? ORDER BY sp.id DESC LIMIT 20");
    $playsStmt->execute([$code]);
    $scrabRecentPlays = array_reverse(array_map(fn($r) => [
        'word'       => $r['word'],
        'score'      => (int)$r['score'],
        'bonus'      => $r['bonus'],
        'name'       => $r['name'],
        'avatar'     => $r['avatar'],
        'device_id'  => $r['device_id'],
        'turn'       => (int)$r['turn'],
    ], $playsStmt->fetchAll()));

    // Last play result (for scrab_word_result screen)
    if ($status === 'scrab_word_result') {
        $lastPlayStmt = $db->prepare("SELECT sp.*, p.name FROM scrab_plays sp JOIN players p ON p.room_code = sp.room_code AND p.device_id = sp.device_id WHERE sp.room_code = ? ORDER BY sp.id DESC LIMIT 1");
        $lastPlayStmt->execute([$code]);
        $lastPlay = $lastPlayStmt->fetch();
        if ($lastPlay) {
            $scrabWordResult = [
                'word'   => $lastPlay['word'],
                'score'  => (int)$lastPlay['score'],
                'bonus'  => $lastPlay['bonus'],
                'name'   => $lastPlay['name'],
                'device_id' => $lastPlay['device_id'],
            ];
        }
    }

    // Auto-advance: turn timer expired → pass for current player
    if ($status === 'scrab_place') {
        $elapsed = $now - (int)$room['scrab_turn_start_time'];
        if ($elapsed >= $scrabTimeLimit * 1000 + 2000) {
            $order = json_decode($room['scrab_turn_order'] ?? '[]', true) ?: [];
            $newStreak = (int)$room['scrab_pass_streak'] + 1;
            $nextRound = (int)$room['scrab_round'] + 1;
            if ($newStreak >= count($order) * 5) {
                scrabRackSubtraction($db, $code);
                $db->prepare("UPDATE rooms SET status = 'finished', scrab_pass_streak = ?, updated_at = ? WHERE code = ?")
                   ->execute([$newStreak, $now, $code]);
                $status = 'finished';
            } else {
                $db->prepare("UPDATE rooms SET scrab_round = ?, scrab_pass_streak = ?, scrab_turn_start_time = ?, updated_at = ? WHERE code = ?")
                   ->execute([$nextRound, $newStreak, $now, $now, $code]);
            }
            $stmt2r = $db->prepare("SELECT * FROM rooms WHERE code = ?");
            $stmt2r->execute([$code]);
            $room = $stmt2r->fetch();
            $status = $room['status'];
        }
    }

    // Auto-advance: scrab_word_result → scrab_place after 3s
    if ($status === 'scrab_word_result') {
        $resultElapsed = $now - (int)$room['updated_at'];
        if ($resultElapsed >= 3000) {
            $ended = scrabAdvanceTurn($db, $code, $room);
            if (!$ended) {
                $stmt2r = $db->prepare("SELECT * FROM rooms WHERE code = ?");
                $stmt2r->execute([$code]);
                $room = $stmt2r->fetch();
            }
            $status = $room['status'];
        }
    }
}

// === BIBLE WORD HUNT state ===
$wordhuntGrid         = null;
$wordhuntWordsCount   = 0;
$wordhuntFoundCount   = 0;
$wordhuntFound        = null;
$wordhuntRecentClaims = [];
$wordhuntElapsedMs    = 0;
$wordhuntCurrentPlayer = null;
$amIWordhuntTurn      = false;
$wordhuntRoundScores  = null;
$wordhuntMode         = 'race';
$wordhuntTimeLimit    = 180;
$wordhuntRoundNum     = 0;
$wordhuntRoundsTotal  = 3;
$wordhuntTurnElapsedMs = 0;
$wordhuntDirCounts    = [];
$wordhuntUnclaimed    = [];

if ($room['game_format'] === 'wordhunt' && in_array($status, ['wordhunt_active', 'wordhunt_round_result'], true)) {
    require_once __DIR__ . '/wordhunt_words.php';

    $wordhuntRoundNum   = (int)$room['wordhunt_round'];
    $wordhuntRoundsTotal = (int)$room['wordhunt_rounds_total'];
    $wordhuntMode       = $room['wordhunt_mode'] ?? 'race';
    $wordhuntTimeLimit  = (int)$room['wordhunt_time_limit'];
    $wordhuntGrid       = json_decode($room['wordhunt_grid'] ?? '[]', true) ?: [];
    $wordsList          = json_decode($room['wordhunt_words'] ?? '[]', true) ?: [];
    $wordhuntWordsCount = count($wordsList);
    $wordhuntElapsedMs  = $now - (int)$room['wordhunt_round_start'];

    // Direction counts for the hint bar (how many words go in each direction)
    foreach ($wordsList as $w) {
        $key = ($w['dr'] ?? 0) . '_' . ($w['dc'] ?? 1);
        $wordhuntDirCounts[$key] = ($wordhuntDirCounts[$key] ?? 0) + 1;
    }

    // Build player → color-index map (position in contestant array)
    $colorMap = [];
    $colorIdx = 0;
    foreach ($playersOut as $p) {
        if (!$p['is_host']) { $colorMap[$p['device_id']] = $colorIdx++ % 10; }
    }

    // Found words for this round
    $foundStmt = $db->prepare(
        "SELECT wc.word, wc.score, wc.bonus, wc.device_id, p.name, p.avatar
         FROM wordhunt_claims wc
         JOIN players p ON p.room_code = wc.room_code AND p.device_id = wc.device_id
         WHERE wc.room_code = ? AND wc.round = ?
         ORDER BY wc.id ASC");
    $foundStmt->execute([$code, $wordhuntRoundNum]);
    $foundRows = $foundStmt->fetchAll();
    $wordhuntFoundCount = count($foundRows);

    // Build word→position lookup from the words list
    $wordPositions = [];
    foreach ($wordsList as $w) {
        $wordPositions[$w['word']] = ['row' => (int)$w['row'], 'col' => (int)$w['col'], 'dr' => (int)($w['dr'] ?? 0), 'dc' => (int)($w['dc'] ?? 1)];
    }

    $wordhuntFound = [];
    $wordhuntRecentClaims = [];
    foreach ($foundRows as $r) {
        $pos = $wordPositions[$r['word']] ?? null;
        $wordhuntFound[$r['word']] = [
            'device_id' => $r['device_id'],
            'name'      => $r['name'],
            'avatar'    => $r['avatar'],
            'color_idx' => $colorMap[$r['device_id']] ?? 0,
            'row'       => $pos ? $pos['row'] : 0,
            'col'       => $pos ? $pos['col'] : 0,
            'dr'        => $pos ? $pos['dr']  : 0,
            'dc'        => $pos ? $pos['dc']  : 1,
            'len'       => mb_strlen($r['word']),
        ];
        $wordhuntRecentClaims[] = [
            'word'      => $r['word'],
            'score'     => (int)$r['score'],
            'bonus'     => $r['bonus'],
            'name'      => $r['name'],
            'avatar'    => $r['avatar'],
            'device_id' => $r['device_id'],
        ];
    }
    $wordhuntRecentClaims = array_slice($wordhuntRecentClaims, -10);

    // Turn mode: who's up
    if ($wordhuntMode === 'turn') {
        $currentWhId   = wordhuntCurrentPlayerId($room);
        $amIWordhuntTurn = $currentWhId === $deviceId;
        $wordhuntTurnElapsedMs = $now - (int)$room['wordhunt_turn_start'];
        if ($currentWhId) {
            foreach ($playersOut as $p) {
                if ($p['device_id'] === $currentWhId) {
                    $wordhuntCurrentPlayer = ['device_id' => $p['device_id'], 'name' => $p['name'], 'avatar' => $p['avatar']];
                    break;
                }
            }
        }
    }

    // === Auto-advance (runs first so round result block sees correct status) ===

    // Race mode: time limit expired
    if ($status === 'wordhunt_active' && $wordhuntMode === 'race') {
        if ($wordhuntElapsedMs >= $wordhuntTimeLimit * 1000 + 2000) {
            $db->prepare("UPDATE rooms SET status = 'wordhunt_round_result', updated_at = ? WHERE code = ? AND status = 'wordhunt_active'")
               ->execute([$now, $code]);
            $status = 'wordhunt_round_result';
        }
    }

    // Round result scores + unclaimed words reveal
    if ($status === 'wordhunt_round_result') {
        // LEFT JOIN so scores show even if player record cleaned up
        $scoreStmt = $db->prepare(
            "SELECT wc.device_id, COALESCE(p.name,'Player') AS name, COALESCE(p.avatar,'👤') AS avatar,
                    COUNT(*) AS words_found, SUM(wc.score) AS round_pts
             FROM wordhunt_claims wc
             LEFT JOIN players p ON p.room_code = wc.room_code AND p.device_id = wc.device_id
             WHERE wc.room_code = ? AND wc.round = ?
             GROUP BY wc.device_id ORDER BY round_pts DESC");
        $scoreStmt->execute([$code, $wordhuntRoundNum]);
        $wordhuntRoundScores = array_map(fn($r) => [
            'device_id'   => $r['device_id'],
            'name'        => $r['name'],
            'avatar'      => $r['avatar'],
            'words_found' => (int)$r['words_found'],
            'round_pts'   => (int)$r['round_pts'],
        ], $scoreStmt->fetchAll());

        // Compute unclaimed directly from wordhunt_claims (not from $wordhuntFound JOIN)
        $claimedStmt = $db->prepare("SELECT DISTINCT word FROM wordhunt_claims WHERE room_code = ? AND round = ?");
        $claimedStmt->execute([$code, $wordhuntRoundNum]);
        $claimedWordSet = [];
        foreach ($claimedStmt->fetchAll() as $cw) { $claimedWordSet[$cw['word']] = true; }

        foreach ($wordsList as $w) {
            if (!isset($claimedWordSet[$w['word']])) {
                $wordhuntUnclaimed[] = [
                    'word' => $w['word'],
                    'row'  => (int)$w['row'],
                    'col'  => (int)$w['col'],
                    'dr'   => (int)($w['dr'] ?? 0),
                    'dc'   => (int)($w['dc'] ?? 1),
                    'len'  => mb_strlen($w['word']),
                ];
            }
        }
    }

    // Turn mode: turn timer expired → auto-pass
    if ($status === 'wordhunt_active' && $wordhuntMode === 'turn') {
        if ($wordhuntTurnElapsedMs >= 47000) { // 45s + 2s buffer
            $newPassStreak = (int)$room['wordhunt_pass_streak'] + 1;
            $order = json_decode($room['wordhunt_turn_order'] ?? '[]', true) ?: [];
            $newTurnIdx = (int)$room['wordhunt_turn_idx'] + 1;
            // End round if full cycle passed with nothing found or all words found
            if ($newPassStreak >= count($order) * 3 || $wordhuntFoundCount >= $wordhuntWordsCount) {
                $db->prepare("UPDATE rooms SET status = 'wordhunt_round_result', updated_at = ? WHERE code = ? AND status = 'wordhunt_active'")
                   ->execute([$now, $code]);
                $status = 'wordhunt_round_result';
            } else {
                $db->prepare("UPDATE rooms SET wordhunt_turn_idx = ?, wordhunt_pass_streak = ?, wordhunt_turn_start = ?, updated_at = ? WHERE code = ? AND status = 'wordhunt_active'")
                   ->execute([$newTurnIdx, $newPassStreak, $now, $now, $code]);
            }
            $stmt2r = $db->prepare("SELECT * FROM rooms WHERE code = ?");
            $stmt2r->execute([$code]);
            $room = $stmt2r->fetch();
            $status = $room['status'];
        }
    }

    // Round result: host must click Proceed (via wordhunt_proceed action) to advance
}

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
        'q_indices_count' => count($qIndices),
        'impostor_round'          => $impRound,
        'impostor_word_pair_idx'  => (int)$room['impostor_word_pair_idx'],
        'impostor_result'        => $room['impostor_result'],
        'impostor_last_skipped'  => (bool)$room['impostor_last_skipped'],
        'draw_round'        => (int)$room['draw_round'],
        'draw_rounds_total' => (int)$room['draw_rounds_total'],
        'scrab_round'         => (int)($room['scrab_round'] ?? 1),
        'wordhunt_round'      => (int)($room['wordhunt_round'] ?? 0),
        'wordhunt_mode'       => $room['wordhunt_mode'] ?? 'race',
        'wordhunt_rounds_total' => (int)($room['wordhunt_rounds_total'] ?? 3)
    ],
    'players'           => $playersOut,
    'player_count'      => count($playersOut),
    'contestant_count'  => $contestantCount,
    'impostor_alive_count' => $impostorAliveCount,
    'answered_count'    => $answeredCount,
    'current_question'  => $qData,
    'answer_reveal'     => $answerReveal,
    'my_answer'         => $myAnswer,
    'is_host'           => $isHost,
    'my_wallet'         => $myWallet,
    'my_used_powerups'  => $myUsedPowerups,
    'my_frozen_until'   => $myFrozenUntil,
    'am_i_impostor'     => $amIImpostor,
    'impostor_clue_count' => $impostorClueCount,
    'impostor_vote_count' => $impostorVoteCount,
    'impostor_clues'      => $impostorClues,
    'impostor_vote_tally' => $impostorVoteTally,
    'impostor_last_elim'  => $impostorLastElim,
    'impostor_reveal'     => $impostorReveal,
    'my_impostor_clue'    => $myImpostorClue,
    'my_impostor_vote'    => $myImpostorVote,
    'impostor_crew_list'      => $impostorCrewList,
    'impostor_impostor_list'  => $impostorImpostorList,
    'draw_current_drawer'  => $drawCurrentDrawer,
    'am_i_drawer'           => $amIDrawer,
    'my_draw_word_choices'  => $myDrawWordChoices,
    'draw_word_idx'         => $drawWordIdx,
    'draw_guesses'          => $drawGuesses,
    'draw_guess_log'        => $drawGuessLog,
    'draw_my_guessed_correctly' => $drawMyGuessedCorrectly,
    'draw_turn_number'      => $drawTurnNumber,
    'draw_total_turns'      => $drawTotalTurns,
    'draw_strokes'          => $drawStrokes,
    'scrab_board'              => $scrabBoard,
    'my_scrab_rack'            => $myScrabRack,
    'scrab_current_player'     => $scrabCurrentPlayer,
    'am_i_scrab_turn'          => $amIScrabTurn,
    'scrab_tiles_in_bag'       => $scrabTilesInBag,
    'scrab_recent_plays'       => $scrabRecentPlays,
    'scrab_time_limit'         => $scrabTimeLimit,
    'scrab_turn_elapsed_ms'    => $scrabTurnElapsedMs,
    'scrab_word_result'        => $scrabWordResult,
    'scrab_round'              => (int)($room['scrab_round'] ?? 1),
    'wordhunt_grid'            => $wordhuntGrid,
    'wordhunt_words_count'     => $wordhuntWordsCount,
    'wordhunt_found_count'     => $wordhuntFoundCount,
    'wordhunt_found'           => $wordhuntFound,
    'wordhunt_dir_counts'      => $wordhuntDirCounts,
    'wordhunt_unclaimed'       => $wordhuntUnclaimed,
    'wordhunt_recent_claims'   => $wordhuntRecentClaims,
    'wordhunt_elapsed_ms'      => $wordhuntElapsedMs,
    'wordhunt_turn_elapsed_ms' => $wordhuntTurnElapsedMs,
    'wordhunt_time_limit'      => $wordhuntTimeLimit,
    'wordhunt_current_player'  => $wordhuntCurrentPlayer,
    'am_i_wordhunt_turn'       => $amIWordhuntTurn,
    'wordhunt_mode'            => $wordhuntMode,
    'wordhunt_round'           => $wordhuntRoundNum,
    'wordhunt_rounds_total'    => $wordhuntRoundsTotal,
    'wordhunt_round_scores'    => $wordhuntRoundScores,
    'events'            => $eventsOut,
    'server_time'       => $now
]);
