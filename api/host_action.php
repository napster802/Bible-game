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

        $diff   = $room['difficulty'];
        $count  = (int)$room['question_count'];
        // Memory boards need real time to flip/match 6 pairs, well beyond the
        // 15-30s trivia-answer window the other formats use. Two Truths needs
        // time to read 3 statements; Higher or Lower is a snap binary guess.
        $formatTimeLimits = ['memory' => 60, 'twotruths' => 20, 'higherlower' => 12];
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
        $format = in_array($value, ['classic', 'truefalse', 'scramble', 'survival', 'memory', 'twotruths', 'higherlower'], true) ? $value : 'classic';
        $db->prepare("UPDATE rooms SET game_format = ?, updated_at = ? WHERE code = ?")
           ->execute([$format, $now, $code]);
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

    default:
        jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
}

jsonOut(['success' => true]);
