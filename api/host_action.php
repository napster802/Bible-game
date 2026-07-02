<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$action   = trim($input['action'] ?? '');

if (!$code || !$deviceId || !$action) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$hostStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ? AND is_host = 1");
$hostStmt->execute([$code, $deviceId]);
if (!$hostStmt->fetch()) jsonOut(['success' => false, 'error' => 'Not authorized'], 403);

$roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$roomStmt->execute([$code]);
$room = $roomStmt->fetch();
if (!$room) jsonOut(['success' => false, 'error' => 'Room not found'], 404);

$now = nowMs();

switch ($action) {
    case 'start_game':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game already started'], 400);

        // Word Impostor has its own no-timer flow (imp_clue/imp_reveal/imp_vote/
        // imp_elim/imp_tiebreak) - nothing below this branch (question pools,
        // time limits) applies to it, so it short-circuits before that logic.
        if ($room['game_format'] === 'wordhunt') {
            require_once __DIR__ . '/wordhunt_words.php';
            $contestantStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0 ORDER BY joined_at ASC");
            $contestantStmt->execute([$code]);
            $contestants = $contestantStmt->fetchAll(PDO::FETCH_COLUMN);
            if (count($contestants) < 1) jsonOut(['success' => false, 'error' => 'Need at least 1 player to start Bible Word Hunt'], 400);

            $words      = wordhuntSelectWords(1);
            $gridResult = wordhuntBuildGrid($words);

            $db->prepare("UPDATE rooms SET status = 'wordhunt_active', wordhunt_round = 1, wordhunt_turn_order = ?, wordhunt_grid = ?, wordhunt_words = ?, wordhunt_round_start = ?, wordhunt_turn_idx = 0, wordhunt_pass_streak = 0, updated_at = ? WHERE code = ?")
               ->execute([json_encode($contestants), json_encode($gridResult['grid']), json_encode($gridResult['words']), $now, $now, $code]);
            break;
        }

        if ($room['game_format'] === 'scrab') {
            require_once __DIR__ . '/scrabble_words.php';
            $contestantStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0 ORDER BY joined_at ASC");
            $contestantStmt->execute([$code]);
            $contestants = $contestantStmt->fetchAll(PDO::FETCH_COLUMN);
            if (count($contestants) < 2) jsonOut(['success' => false, 'error' => 'Need at least 2 players to start Bible Scrabble'], 400);

            $bag = scrabBuildInitialBag();

            // Deal 7 tiles to each player
            foreach ($contestants as $pid) {
                [$drawn, $bag] = scrabDrawTiles($bag, 7);
                $db->prepare("UPDATE players SET scrab_rack = ? WHERE room_code = ? AND device_id = ?")
                   ->execute([json_encode($drawn), $code, $pid]);
            }

            // Init empty 121-cell board (null for each cell)
            $emptyBoard = array_fill(0, 121, null);

            $db->prepare("UPDATE rooms SET status = 'scrab_place', scrab_turn_order = ?, scrab_round = 1, scrab_board = ?, scrab_bag = ?, scrab_turn_start_time = ?, scrab_pass_streak = 0, scrab_start_time = ?, updated_at = ? WHERE code = ?")
               ->execute([json_encode($contestants), json_encode($emptyBoard), json_encode($bag), $now, $now, $now, $code]);
            break;
        }

        if ($room['game_format'] === 'draw') {
            $contestantStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0 ORDER BY joined_at ASC");
            $contestantStmt->execute([$code]);
            $turnOrder = $contestantStmt->fetchAll(PDO::FETCH_COLUMN);
            if (count($turnOrder) < 2) jsonOut(['success' => false, 'error' => 'Need at least 2 players to start Sketch & Guess'], 400);

            $choiceIndices = pickDrawWordChoices();
            $db->prepare("UPDATE rooms SET status = 'draw_choose', draw_turn_order = ?, draw_round = 1, draw_word_choice_indices = ?, draw_word_idx = -1, updated_at = ? WHERE code = ?")
               ->execute([json_encode($turnOrder), json_encode($choiceIndices), $now, $code]);
            break;
        }

        if ($room['game_format'] === 'blitz') {
            $db->prepare("UPDATE rooms SET status = 'blitz_active', blitz_start_time = ?, updated_at = ? WHERE code = ?")
               ->execute([$now, $now, $code]);
            // Reset all contestants' blitz_q_idx to 0
            $db->prepare("UPDATE players SET blitz_q_idx = 0 WHERE room_code = ? AND is_host = 0")
               ->execute([$code]);
            break;
        }

        if ($room['game_format'] === 'bowl') {
            // Auto-assign teams for any unassigned contestants, alternating 1/2
            $contestantStmt = $db->prepare("SELECT device_id, team_id FROM players WHERE room_code = ? AND is_host = 0 ORDER BY joined_at ASC");
            $contestantStmt->execute([$code]);
            $contestants = $contestantStmt->fetchAll();
            if (count($contestants) < 2) jsonOut(['success' => false, 'error' => 'Need at least 2 players to start Bible Bowl'], 400);
            $teamCycle = 1;
            foreach ($contestants as $p) {
                if ((int)$p['team_id'] === 0) {
                    $db->prepare("UPDATE players SET team_id = ? WHERE room_code = ? AND device_id = ?")
                       ->execute([$teamCycle, $code, $p['device_id']]);
                    $teamCycle = $teamCycle === 1 ? 2 : 1;
                }
            }
            // Fall through to standard trivia flow below
        }

        if ($room['game_format'] === 'impostor') {
            $contestantStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0");
            $contestantStmt->execute([$code]);
            $contestants = $contestantStmt->fetchAll(PDO::FETCH_COLUMN);
            if (count($contestants) < 3) jsonOut(['success' => false, 'error' => 'Need at least 3 players to start Word Impostor'], 400);

            // 8+ player lobbies get 2 impostors instead of 1, so a single
            // crew majority isn't overwhelming once the lobby gets large.
            $impostorCount = count($contestants) >= 8 ? 2 : 1;
            $pool = $contestants;
            $impostorId = $pool[random_int(0, count($pool) - 1)];
            $pool = array_values(array_diff($pool, [$impostorId]));
            $impostorId2 = $impostorCount === 2 ? $pool[random_int(0, count($pool) - 1)] : null;
            $wordPairIdx = random_int(0, 129); // js/impostor_data.js ImpostorData.PAIRS has exactly 130 entries

            $db->prepare("UPDATE players SET eliminated = 0 WHERE room_code = ?")->execute([$code]);
            $db->prepare("UPDATE rooms SET status = 'imp_clue', impostor_word_pair_idx = ?, impostor_id = ?, impostor_id_2 = ?, impostor_round = 1, impostor_result = NULL, impostor_last_elim_id = NULL, impostor_last_skipped = 0, updated_at = ? WHERE code = ?")
               ->execute([$wordPairIdx, $impostorId, $impostorId2, $now, $code]);
            break;
        }

        if ($room['game_format'] === 'hotseat') {
            $contestantStmt2 = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0 ORDER BY joined_at ASC");
            $contestantStmt2->execute([$code]);
            $hsContestants = $contestantStmt2->fetchAll(PDO::FETCH_COLUMN);
            if (count($hsContestants) < 2) jsonOut(['success' => false, 'error' => 'Need at least 2 players for Hot Seat Challenge'], 400);
            shuffle($hsContestants);

            $hsQCount = max(1, (int)$room['hs_q_count']);
            $totalHsCount = count($hsContestants) * $hsQCount;

            // Same pool selection as classic
            $hsDiff = $room['difficulty'];
            if ($room['quiz_mode'] === 'book') {
                if (!$room['book'] || !$room['category']) jsonOut(['success' => false, 'error' => 'Pick a book and category first'], 400);
                $hsPoolSize = (int)$room['pool_size'];
                if ($hsPoolSize <= 0) jsonOut(['success' => false, 'error' => 'No questions available'], 400);
                $hsPool = range(0, $hsPoolSize - 1);
            } else {
                $hsPool = range(0, 49);
            }
            $hsExclude = array_flip(array_map('intval', $input['exclude_indices'] ?? []));
            $hsFresh = array_values(array_filter($hsPool, fn($i) => !isset($hsExclude[$i])));
            if (empty($hsFresh)) jsonOut(['success' => false, 'error' => 'All questions played. Clear progress or change pool.'], 400);
            shuffle($hsFresh);
            $hsIndices = array_slice($hsFresh, 0, min($totalHsCount, count($hsFresh)));
            $actualHsCount = count($hsIndices);

            $db->prepare("DELETE FROM answers WHERE room_code = ?")->execute([$code]);
            $db->prepare("DELETE FROM hs_bets WHERE room_code = ?")->execute([$code]);
            $db->prepare("UPDATE rooms SET status = 'hs_question', current_q_idx = 0, q_start_time = ?, hs_seat_order = ?, hs_seat_idx = 0, hs_q_start_time = ?, q_indices = ?, question_count = ?, time_limit = ?, updated_at = ? WHERE code = ?")
               ->execute([$now, json_encode($hsContestants), $now, json_encode($hsIndices), $actualHsCount, 25, $now, $code]);
            break;
        }

        $diff   = $room['difficulty'];
        $count  = (int)$room['question_count'];
        // Memory boards need real time to flip/match 6 pairs, well beyond the
        // 15-30s trivia-answer window the other formats use. Two Truths needs
        // time to read 3 statements; Higher or Lower is a snap binary guess.
        $formatTimeLimits = ['memory' => 60, 'twotruths' => 20, 'higherlower' => 12, 'versefill' => 25, 'emojiclue' => 25];
        $tlimit = $formatTimeLimits[$room['game_format']] ?? getTimeLimitForDifficulty($diff);

        if ($room['quiz_mode'] === 'book') {
            if (!$room['book'] || !$room['category']) jsonOut(['success' => false, 'error' => 'Pick a book and category first'], 400);
            $poolSize = (int)$room['pool_size'];
            if ($poolSize <= 0) jsonOut(['success' => false, 'error' => 'No questions available for that book/category/difficulty'], 400);
            $indices = range(0, $poolSize - 1);
        } else {
            $indices = range(0, 49);
        }

        // Exclude indices the host's browser has already played for this exact
        // pool (see QuestionTracker), so repeated games don't repeat questions.
        $excludeSet = array_flip(array_map('intval', $input['exclude_indices'] ?? []));
        $freshIndices = array_values(array_filter($indices, fn($i) => !isset($excludeSet[$i])));

        if (empty($freshIndices)) {
            jsonOut(['success' => false, 'error' => 'All questions for this selection have already been played. Try a different book, category, testament, or difficulty - or tap "Clear All Progress" to replay them.'], 400);
        }

        shuffle($freshIndices);
        $indices = array_slice($freshIndices, 0, min($count, count($freshIndices)));
        $actualCount = count($indices);

        $db->prepare("UPDATE rooms SET status = 'playing', current_q_idx = 0, q_start_time = ?, q_indices = ?, question_count = ?, time_limit = ?, updated_at = ? WHERE code = ?")
           ->execute([$now, json_encode($indices), $actualCount, $tlimit, $now, $code]);
        break;

    case 'next_question':
        if (!in_array($room['status'], ['leaderboard', 'answer_reveal'], true))
            jsonOut(['success' => false, 'error' => 'Not in leaderboard state'], 400);

        $nextIdx = (int)$room['current_q_idx'] + 1;
        $qIndices = json_decode($room['q_indices'], true) ?: [];

        if ($nextIdx >= count($qIndices)) {
            $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")
               ->execute([$now, $code]);
        } else {
            $db->prepare("UPDATE rooms SET status = 'playing', current_q_idx = ?, q_start_time = ?, updated_at = ? WHERE code = ?")
               ->execute([$nextIdx, $now, $now, $code]);
        }
        break;

    case 'force_reveal':
        if ($room['status'] !== 'playing') jsonOut(['success' => false, 'error' => 'Not playing'], 400);
        $db->prepare("UPDATE rooms SET status = 'answer_reveal', updated_at = ? WHERE code = ?")
           ->execute([$now, $code]);
        break;

    case 'end_game':
        $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")
           ->execute([$now, $code]);
        break;

    case 'remove_player':
        $targetId = trim($input['target_device_id'] ?? '');
        if (!$targetId) jsonOut(['success' => false, 'error' => 'No target'], 400);
        $db->prepare("DELETE FROM players WHERE room_code = ? AND device_id = ? AND is_host = 0")->execute([$code, $targetId]);
        break;

    case 'set_difficulty':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $value = $input['value'] ?? 'easy';
        $diff = in_array($value, ['easy', 'medium', 'hard', 'expert'], true) ? $value : 'easy';
        $tlimit = getTimeLimitForDifficulty($diff);
        $db->prepare("UPDATE rooms SET difficulty = ?, time_limit = ?, updated_at = ? WHERE code = ?")
           ->execute([$diff, $tlimit, $now, $code]);
        break;

    case 'set_question_count':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $value = (int)($input['value'] ?? 10);
        $count = in_array($value, [10, 20, 30, 50], true) ? $value : 10;
        $db->prepare("UPDATE rooms SET question_count = ?, updated_at = ? WHERE code = ?")
           ->execute([$count, $now, $code]);
        break;

    case 'set_quiz_mode':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $value = $input['value'] ?? 'difficulty';
        $mode = in_array($value, ['difficulty', 'book'], true) ? $value : 'difficulty';
        $db->prepare("UPDATE rooms SET quiz_mode = ?, updated_at = ? WHERE code = ?")
           ->execute([$mode, $now, $code]);
        break;

    case 'set_game_format':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $value = $input['value'] ?? 'classic';
        $format = in_array($value, ['classic', 'truefalse', 'scramble', 'survival', 'memory', 'twotruths', 'higherlower', 'versefill', 'emojiclue', 'impostor', 'draw', 'scrab', 'wordhunt', 'blitz', 'bowl', 'hotseat'], true) ? $value : 'classic';
        $db->prepare("UPDATE rooms SET game_format = ?, updated_at = ? WHERE code = ?")
           ->execute([$format, $now, $code]);
        break;

    case 'set_draw_rounds':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $value = (int)($input['value'] ?? 1);
        $rounds = in_array($value, [1, 2], true) ? $value : 1;
        $db->prepare("UPDATE rooms SET draw_rounds_total = ?, updated_at = ? WHERE code = ?")
           ->execute([$rounds, $now, $code]);
        break;

    // ---- Hot Seat Challenge ----
    case 'set_hs_q_count':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $v = (int)($input['value'] ?? 3);
        $v = in_array($v, [3, 5, 7], true) ? $v : 3;
        $db->prepare("UPDATE rooms SET hs_q_count = ?, updated_at = ? WHERE code = ?")->execute([$v, $now, $code]);
        break;

    case 'hs_force_advance':
        if (!in_array($room['status'], ['hs_question', 'hs_reveal'], true)) jsonOut(['success' => false, 'error' => 'Not in hot seat state'], 400);
        if ($room['status'] === 'hs_question') {
            $db->prepare("UPDATE rooms SET status = 'hs_reveal', updated_at = ? WHERE code = ?")->execute([$now, $code]);
        } else {
            // hs_reveal → advance
            $nextQIdx = (int)$room['current_q_idx'] + 1;
            $qIndices = json_decode($room['q_indices'], true) ?: [];
            if ($nextQIdx >= count($qIndices)) {
                $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")->execute([$now, $code]);
            } else {
                $db->prepare("UPDATE rooms SET status = 'hs_question', current_q_idx = ?, q_start_time = ?, hs_q_start_time = ?, updated_at = ? WHERE code = ?")
                   ->execute([$nextQIdx, $now, $now, $now, $code]);
            }
        }
        break;

    // ---- Bible Bowl (Teams) ----
    case 'bowl_assign_team':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $targetId = trim($input['target_device_id'] ?? '');
        $teamId   = (int)($input['team_id'] ?? 0);
        if (!$targetId || !in_array($teamId, [1, 2], true)) jsonOut(['success' => false, 'error' => 'Invalid params'], 400);
        $db->prepare("UPDATE players SET team_id = ? WHERE room_code = ? AND device_id = ? AND is_host = 0")
           ->execute([$teamId, $code, $targetId]);
        break;

    case 'bowl_auto_assign':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $contestantStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0 ORDER BY joined_at ASC");
        $contestantStmt->execute([$code]);
        $contestants = $contestantStmt->fetchAll(PDO::FETCH_COLUMN);
        $teamCycle = 1;
        foreach ($contestants as $pid) {
            $db->prepare("UPDATE players SET team_id = ? WHERE room_code = ? AND device_id = ?")
               ->execute([$teamCycle, $code, $pid]);
            $teamCycle = $teamCycle === 1 ? 2 : 1;
        }
        break;

    // ---- Word Impostor: host-driven transitions (no timer fallback) ----
    case 'impostor_start_voting':
        if ($room['status'] !== 'imp_reveal') jsonOut(['success' => false, 'error' => 'Not in reveal state'], 400);
        $db->prepare("UPDATE rooms SET status = 'imp_vote', updated_at = ? WHERE code = ?")->execute([$now, $code]);
        break;

    case 'impostor_next_round':
        if ($room['status'] !== 'imp_elim') jsonOut(['success' => false, 'error' => 'Not in elimination state'], 400);
        $nextRound = (int)$room['impostor_round'] + 1;
        $db->prepare("UPDATE rooms SET status = 'imp_clue', impostor_round = ?, updated_at = ? WHERE code = ?")
           ->execute([$nextRound, $now, $code]);
        break;

    case 'impostor_resolve_tiebreak':
        if ($room['status'] !== 'imp_tiebreak') jsonOut(['success' => false, 'error' => 'Not in tiebreak state'], 400);
        $tieTargetId = trim($input['target_device_id'] ?? '');
        applyImpostorElimination($db, $code, $tieTargetId !== '' ? $tieTargetId : null);
        break;

    case 'impostor_force_advance':
        // No-timer escape hatch: every other format falls back to a time
        // limit if a player stalls; Word Impostor has none, so this is the
        // host's only way to rescue a round stuck on an AFK player.
        if ($room['status'] === 'imp_clue') {
            $aliveIds = impostorAliveContestants($db, $code);
            foreach ($aliveIds as $pid) {
                $clueCheck = $db->prepare("SELECT 1 FROM impostor_clues WHERE room_code = ? AND device_id = ? AND round = ?");
                $clueCheck->execute([$code, $pid, (int)$room['impostor_round']]);
                if (!$clueCheck->fetchColumn()) {
                    $db->prepare("INSERT OR IGNORE INTO impostor_clues (room_code, device_id, round, clue, submitted_at) VALUES (?, ?, ?, '(no clue)', ?)")
                       ->execute([$code, $pid, (int)$room['impostor_round'], $now]);
                }
            }
            $db->prepare("UPDATE rooms SET status = 'imp_reveal', updated_at = ? WHERE code = ?")->execute([$now, $code]);
        } elseif ($room['status'] === 'imp_vote') {
            resolveImpostorVotes($db, $code, (int)$room['impostor_round']);
        } else {
            jsonOut(['success' => false, 'error' => 'Nothing to force-advance'], 400);
        }
        break;

    // ---- Sketch & Guess: host-driven transitions ----
    case 'draw_next_turn':
        if ($room['status'] !== 'draw_reveal') jsonOut(['success' => false, 'error' => 'Not in reveal state'], 400);
        advanceDrawTurn($db, $code);
        break;

    case 'draw_force_advance':
        // No-timer-on-choosing escape hatch (mirrors impostor_force_advance):
        // if the drawer stalls on draw_choose, auto-pick their first offered
        // word so the round isn't stuck forever; if a round is already
        // drawing, just cut it short and reveal early.
        if ($room['status'] === 'draw_choose') {
            $choices = json_decode($room['draw_word_choice_indices'], true) ?: [];
            if (!empty($choices)) {
                $db->prepare("UPDATE rooms SET status = 'draw_active', draw_word_idx = ?, draw_round_start_time = ?, updated_at = ? WHERE code = ?")
                   ->execute([$choices[0], $now, $now, $code]);
            }
        } elseif ($room['status'] === 'draw_active') {
            finishDrawRound($db, $code);
        } else {
            jsonOut(['success' => false, 'error' => 'Nothing to force-advance'], 400);
        }
        break;

    case 'set_book_category':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $book      = trim($input['book'] ?? '');
        $category  = trim($input['category'] ?? '');
        $testValue = $input['testament'] ?? 'all';
        $testament = in_array($testValue, ['all', 'ot', 'nt'], true) ? $testValue : 'all';
        $poolSize  = max(0, (int)($input['pool_size'] ?? 0));
        if (!$book || !$category) jsonOut(['success' => false, 'error' => 'Missing book or category'], 400);
        $db->prepare("UPDATE rooms SET book = ?, category = ?, testament = ?, pool_size = ?, updated_at = ? WHERE code = ?")
           ->execute([$book, $category, $testament, $poolSize, $now, $code]);
        break;

    // ---- Bible Scrabble: host-driven actions ----
    case 'set_scrab_time_limit':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $tlimit = (int)($input['value'] ?? 90);
        $tlimit = in_array($tlimit, [60, 90, 120], true) ? $tlimit : 90;
        $db->prepare("UPDATE rooms SET scrab_time_limit = ?, updated_at = ? WHERE code = ?")
           ->execute([$tlimit, $now, $code]);
        break;

    case 'scrab_force_skip':
        if ($room['status'] !== 'scrab_place') jsonOut(['success' => false, 'error' => 'Not in Scrabble turn'], 400);
        require_once __DIR__ . '/scrabble_words.php';
        scrabAdvanceTurn($db, $code, $room);
        $db->prepare("UPDATE rooms SET scrab_pass_streak = scrab_pass_streak + 1, updated_at = ? WHERE code = ?")->execute([$now, $code]);
        break;

    case 'scrab_end_game':
        if (!in_array($room['status'], ['scrab_place', 'scrab_word_result'], true))
            jsonOut(['success' => false, 'error' => 'Not in a Scrabble game'], 400);
        require_once __DIR__ . '/scrabble_words.php';
        scrabRackSubtraction($db, $code);
        $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")->execute([$now, $code]);
        break;

    // ---- Bible Word Hunt: lobby settings ----
    case 'set_wordhunt_mode':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $whMode = ($input['value'] ?? 'race') === 'turn' ? 'turn' : 'race';
        // Adjust default time limit: race=180s, turn=45s
        $whTime = $whMode === 'turn' ? 45 : 180;
        $db->prepare("UPDATE rooms SET wordhunt_mode = ?, wordhunt_time_limit = ?, updated_at = ? WHERE code = ?")
           ->execute([$whMode, $whTime, $now, $code]);
        break;

    case 'set_wordhunt_rounds':
        if ($room['status'] !== 'lobby') jsonOut(['success' => false, 'error' => 'Game in progress'], 400);
        $whRounds = (int)($input['value'] ?? 3);
        $whRounds = in_array($whRounds, [2, 3, 4], true) ? $whRounds : 3;
        $db->prepare("UPDATE rooms SET wordhunt_rounds_total = ?, updated_at = ? WHERE code = ?")
           ->execute([$whRounds, $now, $code]);
        break;

    // ---- Bible Word Hunt: host in-game controls ----
    case 'wordhunt_force_next':
        if ($room['status'] !== 'wordhunt_active') jsonOut(['success' => false, 'error' => 'Not in Word Hunt'], 400);
        require_once __DIR__ . '/wordhunt_words.php';
        // In turn mode, advance the current player's turn
        if (($room['wordhunt_mode'] ?? 'race') === 'turn') {
            wordhuntAdvanceTurn($db, $code, $room);
            $db->prepare("UPDATE rooms SET wordhunt_pass_streak = wordhunt_pass_streak + 1, updated_at = ? WHERE code = ?")->execute([$now, $code]);
        }
        break;

    case 'wordhunt_force_end':
        if (!in_array($room['status'], ['wordhunt_active', 'wordhunt_round_result'], true))
            jsonOut(['success' => false, 'error' => 'Not in a Word Hunt game'], 400);
        $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")->execute([$now, $code]);
        break;

    case 'wordhunt_proceed':
        if ($room['status'] !== 'wordhunt_round_result')
            jsonOut(['success' => false, 'error' => 'Not at round result'], 400);
        require_once __DIR__ . '/wordhunt_words.php';
        $currentRound  = (int)$room['wordhunt_round'];
        $totalRounds   = (int)$room['wordhunt_rounds_total'];
        $nextRound     = $currentRound + 1;
        if ($nextRound > $totalRounds) {
            $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ? AND status = 'wordhunt_round_result'")
               ->execute([$now, $code]);
        } else {
            $newWords      = wordhuntSelectWords($nextRound);
            $newGridResult = wordhuntBuildGrid($newWords);
            $db->prepare("UPDATE rooms SET status = 'wordhunt_active', wordhunt_round = ?, wordhunt_grid = ?, wordhunt_words = ?, wordhunt_round_start = ?, wordhunt_turn_idx = 0, wordhunt_pass_streak = 0, updated_at = ? WHERE code = ? AND status = 'wordhunt_round_result'")
               ->execute([$nextRound, json_encode($newGridResult['grid']), json_encode($newGridResult['words']), $now, $now, $code]);
        }
        break;

    default:
        jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
}

jsonOut(['success' => true]);
