<?php
/* ------------------------------------------------------------
   Turn ANY uncaught error/exception/fatal into a clean JSON
   response instead of a raw PHP error page. Without this, a
   crash (e.g. pdo_sqlite missing, or data/ not writable on
   Android storage) makes fetch().then(r => r.json()) throw a
   parse error on the client, which looks exactly like a network
   failure ("Could not reach the host server") and hides the
   real cause.
   ------------------------------------------------------------ */
function sendJsonError(string $message, int $code = 500): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        http_response_code($code);
    }
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

set_exception_handler(function ($e) {
    sendJsonError('Server error: ' . $e->getMessage());
});

register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        sendJsonError('Fatal server error: ' . $err['message']);
    }
});

define('DB_PATH', __DIR__ . '/../data/game.db');

// Bump whenever migrateSchema()'s $columns table gains/changes entries, so
// existing deployments pick up the new columns exactly once instead of never
// (see the PRAGMA user_version guard around migrateSchema() in initDB()).
define('SCHEMA_VERSION', 2);

function getDB(): PDO {
    static $db = null;
    if ($db === null) {
        $dir = dirname(DB_PATH);
        if (!is_dir($dir) && !@mkdir($dir, 0777, true) && !is_dir($dir)) {
            throw new RuntimeException("Cannot create data directory ($dir). Check Android storage permissions for KSWEB.");
        }
        if (!is_writable($dir)) {
            throw new RuntimeException("Data directory is not writable ($dir). Grant KSWEB storage/file access permission in Android settings.");
        }
        if (!extension_loaded('pdo_sqlite')) {
            throw new RuntimeException('The pdo_sqlite PHP extension is not enabled. Enable it in KSWEB\'s PHP settings.');
        }
        try {
            $db = new PDO('sqlite:' . DB_PATH);
        } catch (PDOException $e) {
            throw new RuntimeException('Cannot open SQLite database: ' . $e->getMessage());
        }
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL');
        $db->exec('PRAGMA synchronous=NORMAL');
        // Every poll (room_state.php) and action (submit_answer.php, host_action.php)
        // opens its own connection/transaction. Without a busy timeout, SQLite
        // throws "database is locked" the instant two requests' writes overlap
        // (e.g. several players submitting an answer at once) instead of
        // waiting briefly for the other transaction to finish.
        $db->exec('PRAGMA busy_timeout=5000');
        initDB($db);
    }
    return $db;
}

function initDB(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS rooms (
            code TEXT PRIMARY KEY,
            host_device_id TEXT NOT NULL,
            difficulty TEXT DEFAULT 'easy',
            question_count INTEGER DEFAULT 10,
            status TEXT DEFAULT 'lobby',
            current_q_idx INTEGER DEFAULT -1,
            q_start_time INTEGER DEFAULT 0,
            q_indices TEXT DEFAULT '[]',
            time_limit INTEGER DEFAULT 30,
            points_awarded INTEGER DEFAULT 0,
            quiz_mode TEXT DEFAULT 'difficulty',
            book TEXT,
            category TEXT,
            testament TEXT DEFAULT 'all',
            pool_size INTEGER DEFAULT 50,
            game_format TEXT DEFAULT 'classic',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS players (
            device_id TEXT NOT NULL,
            room_code TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            wrong_count INTEGER DEFAULT 0,
            total_time REAL DEFAULT 0,
            is_host INTEGER DEFAULT 0,
            joined_at INTEGER NOT NULL,
            last_ping INTEGER NOT NULL,
            PRIMARY KEY (device_id, room_code)
        );
        CREATE TABLE IF NOT EXISTS profiles (
            device_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            avatar_type TEXT DEFAULT 'emoji',
            wallet INTEGER DEFAULT 0,
            equipped_name_effect TEXT,
            equipped_border TEXT,
            owned_name_effects TEXT DEFAULT '[]',
            owned_borders TEXT DEFAULT '[]',
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS answers (
            room_code TEXT NOT NULL,
            device_id TEXT NOT NULL,
            q_idx INTEGER NOT NULL,
            choice_idx INTEGER NOT NULL,
            is_correct INTEGER NOT NULL,
            points INTEGER NOT NULL,
            time_taken REAL NOT NULL,
            submitted_at INTEGER NOT NULL,
            PRIMARY KEY (room_code, device_id, q_idx)
        );
        CREATE TABLE IF NOT EXISTS custom_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book TEXT NOT NULL,
            category TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            question TEXT NOT NULL,
            choice1 TEXT NOT NULL,
            choice2 TEXT NOT NULL,
            choice3 TEXT NOT NULL,
            choice4 TEXT NOT NULL,
            answer TEXT NOT NULL,
            reference TEXT DEFAULT '',
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS room_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_code TEXT NOT NULL,
            device_id TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_room_events_room ON room_events(room_code, id);
        CREATE TABLE IF NOT EXISTS impostor_clues (
            room_code TEXT NOT NULL,
            device_id TEXT NOT NULL,
            round INTEGER NOT NULL,
            clue TEXT NOT NULL,
            submitted_at INTEGER NOT NULL,
            PRIMARY KEY (room_code, device_id, round)
        );
        CREATE TABLE IF NOT EXISTS impostor_votes (
            room_code TEXT NOT NULL,
            device_id TEXT NOT NULL,
            round INTEGER NOT NULL,
            target_device_id TEXT NOT NULL,
            submitted_at INTEGER NOT NULL,
            PRIMARY KEY (room_code, device_id, round)
        );
        CREATE TABLE IF NOT EXISTS leaderboard_stats (
            device_id TEXT NOT NULL,
            game_format TEXT NOT NULL,
            total_points INTEGER DEFAULT 0,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (device_id, game_format)
        );
        CREATE TABLE IF NOT EXISTS drawing_strokes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_code TEXT NOT NULL,
            round INTEGER NOT NULL,
            drawer_device_id TEXT NOT NULL,
            points TEXT NOT NULL,
            color TEXT NOT NULL,
            line_width INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_drawing_strokes_room ON drawing_strokes(room_code, round, id);
        CREATE TABLE IF NOT EXISTS drawing_guesses (
            room_code TEXT NOT NULL,
            device_id TEXT NOT NULL,
            round INTEGER NOT NULL,
            guess_text TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            rank INTEGER,
            submitted_at INTEGER NOT NULL,
            PRIMARY KEY (room_code, device_id, round)
        );
        CREATE TABLE IF NOT EXISTS drawing_guess_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_code TEXT NOT NULL,
            device_id TEXT NOT NULL,
            round INTEGER NOT NULL,
            guess_text TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_drawing_guess_log_room ON drawing_guess_log(room_code, round, id);
    ");
    // ALTER TABLE attempts (in migrateSchema) momentarily need a stronger lock
    // than plain reads/writes, even when the column already exists and the
    // attempt is a no-op. Running ~25 of them on every single request (every
    // poll, from every player) made "database is locked" far more likely
    // whenever requests overlapped - e.g. the burst of host + player polls
    // right as Start Game is pressed. A schema version pragma lets every
    // request after the first-ever run skip migrateSchema() entirely.
    $version = (int)$db->query('PRAGMA user_version')->fetchColumn();
    if ($version < SCHEMA_VERSION) {
        migrateSchema($db);
        $db->exec('PRAGMA user_version = ' . SCHEMA_VERSION);
    }
}

// SQLite has no "ADD COLUMN IF NOT EXISTS"; safely retrofit columns onto
// databases created before this column existed by ignoring the
// "duplicate column" error each ALTER TABLE throws if already applied.
function migrateSchema(PDO $db): void {
    $columns = [
        'rooms'    => [
            'points_awarded' => "INTEGER DEFAULT 0",
            'quiz_mode'      => "TEXT DEFAULT 'difficulty'",
            'book'           => "TEXT",
            'category'       => "TEXT",
            'testament'      => "TEXT DEFAULT 'all'",
            'pool_size'      => "INTEGER DEFAULT 50",
            'game_format'    => "TEXT DEFAULT 'classic'",
            'impostor_word_pair_idx'   => "INTEGER DEFAULT -1",
            'impostor_id'              => "TEXT",
            'impostor_id_2'            => "TEXT",
            'impostor_round'           => "INTEGER DEFAULT 1",
            'impostor_result'          => "TEXT",
            'impostor_last_elim_id'    => "TEXT",
            'impostor_last_skipped'    => "INTEGER DEFAULT 0",
            'draw_turn_order'          => "TEXT DEFAULT '[]'",
            'draw_round'               => "INTEGER DEFAULT 1",
            'draw_rounds_total'        => "INTEGER DEFAULT 1",
            'draw_word_choice_indices' => "TEXT DEFAULT '[]'",
            'draw_word_idx'            => "INTEGER DEFAULT -1",
            'draw_round_start_time'    => "INTEGER DEFAULT 0",
        ],
        'profiles' => [
            'wallet'                => "INTEGER DEFAULT 0",
            'equipped_name_effect'  => "TEXT",
            'equipped_border'       => "TEXT",
            'owned_name_effects'    => "TEXT DEFAULT '[]'",
            'owned_borders'         => "TEXT DEFAULT '[]'",
        ],
        'players' => [
            'streak'         => "INTEGER DEFAULT 0",
            'best_streak'    => "INTEGER DEFAULT 0",
            'used_powerups'  => "TEXT DEFAULT '[]'",
            'double_q_idx'   => "INTEGER DEFAULT -1",
            'frozen_until'   => "INTEGER DEFAULT 0",
            'eliminated'     => "INTEGER DEFAULT 0",
        ],
    ];
    foreach ($columns as $table => $cols) {
        foreach ($cols as $col => $def) {
            try {
                $db->exec("ALTER TABLE $table ADD COLUMN $col $def");
            } catch (PDOException $e) {
                // Column already exists - ignore.
            }
        }
    }
}

function jsonOut(array $data, int $code = 200): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getInput(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function nowMs(): int {
    return (int)(microtime(true) * 1000);
}

function generateCode(): string {
    return str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
}

function cleanStale(PDO $db): void {
    $cutoff = nowMs() - 86400000; // 24 hours
    $db->prepare("DELETE FROM answers WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM players WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM room_events WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM impostor_clues WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM impostor_votes WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM drawing_strokes WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM drawing_guesses WHERE room_code IN (SELECT code FROM rooms WHERE created_at < ?)")->execute([$cutoff]);
    $db->prepare("DELETE FROM rooms WHERE created_at < ?")->execute([$cutoff]);
}

function markStalePlayers(PDO $db, string $roomCode): void {
    // Remove non-host players who haven't pinged in 30 seconds
    $cutoff = nowMs() - 30000;
    $db->prepare("DELETE FROM players WHERE room_code = ? AND is_host = 0 AND last_ping < ?")->execute([$roomCode, $cutoff]);
}

function getTimeLimitForDifficulty(string $diff): int {
    switch ($diff) {
        case 'easy': return 30;
        case 'medium': return 25;
        case 'hard': return 20;
        case 'expert': return 15;
        default: return 30;
    }
}

/* ------------------------------------------------------------
   WORD IMPOSTOR - shared helpers
   No timer in this format: every round either auto-advances once
   every alive contestant has acted, or waits on an explicit host
   action (host_action.php's impostor_* cases). Both room_state.php
   (auto-advance) and host_action.php (tiebreak resolution / force
   advance) call into this same elimination logic so a round only
   ever ends one way, however it got triggered.
   ------------------------------------------------------------ */
const IMPOSTOR_CREW_WIN_POINTS = 100;
const IMPOSTOR_VOTE_BONUS = 50;
const IMPOSTOR_WIN_POINTS = 250;

function impostorAliveContestants(PDO $db, string $code): array {
    $stmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND is_host = 0 AND eliminated = 0");
    $stmt->execute([$code]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// Returns the 1 or 2 impostor device_ids for a room (impostor_id_2 is only
// set for 8+ player games - see host_action.php's start_game).
function impostorIdsOf(array $room): array {
    $ids = [];
    if (!empty($room['impostor_id'])) $ids[] = $room['impostor_id'];
    if (!empty($room['impostor_id_2'])) $ids[] = $room['impostor_id_2'];
    return $ids;
}

// Eliminates $eliminatedId (or, if null, records a skipped round - the
// tiebreak host chose not to eliminate anyone) then checks both win
// conditions: the crew catching every impostor, or the impostor side
// surviving down to a headcount where they outnumber/match the crew
// (alive <= alive impostors + 1). Falls through to the next round otherwise.
function applyImpostorElimination(PDO $db, string $code, ?string $eliminatedId): void {
    $now = nowMs();
    $roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
    $roomStmt->execute([$code]);
    $room = $roomStmt->fetch();
    if (!$room) return;
    $impostorIds = impostorIdsOf($room);
    $round = (int)$room['impostor_round'];

    if ($eliminatedId !== null) {
        $db->prepare("UPDATE players SET eliminated = 1 WHERE room_code = ? AND device_id = ?")->execute([$code, $eliminatedId]);
        $db->prepare("UPDATE rooms SET impostor_last_elim_id = ?, impostor_last_skipped = 0 WHERE code = ?")->execute([$eliminatedId, $code]);
    } else {
        $db->prepare("UPDATE rooms SET impostor_last_elim_id = NULL, impostor_last_skipped = 1 WHERE code = ?")->execute([$code]);
    }

    $aliveIds = impostorAliveContestants($db, $code);
    $aliveImpostorIds = array_values(array_intersect($impostorIds, $aliveIds));
    $crewWin = ($eliminatedId !== null && in_array($eliminatedId, $impostorIds, true) && empty($aliveImpostorIds));
    $impostorWin = (!$crewWin && !empty($aliveImpostorIds) && count($aliveIds) <= count($aliveImpostorIds) + 1);

    if ($crewWin) {
        foreach ($aliveIds as $pid) {
            $voteStmt = $db->prepare("SELECT target_device_id FROM impostor_votes WHERE room_code = ? AND device_id = ? AND round = ?");
            $voteStmt->execute([$code, $pid, $round]);
            $votedForImpostor = in_array($voteStmt->fetchColumn(), $impostorIds, true);
            $points = IMPOSTOR_CREW_WIN_POINTS + ($votedForImpostor ? IMPOSTOR_VOTE_BONUS : 0);
            $db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
               ->execute([$points, $code, $pid]);
        }
        $db->prepare("UPDATE rooms SET status = 'finished', impostor_result = 'crew_win', updated_at = ? WHERE code = ?")->execute([$now, $code]);
    } elseif ($impostorWin) {
        foreach ($aliveImpostorIds as $pid) {
            $db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
               ->execute([IMPOSTOR_WIN_POINTS, $code, $pid]);
        }
        $db->prepare("UPDATE rooms SET status = 'finished', impostor_result = 'impostor_win', updated_at = ? WHERE code = ?")->execute([$now, $code]);
    } else {
        $db->prepare("UPDATE rooms SET status = 'imp_elim', updated_at = ? WHERE code = ?")->execute([$now, $code]);
    }
}

// Tallies this round's votes and either eliminates the sole top-voted
// player, or - on a tie for most votes - hands the decision to the host
// via the imp_tiebreak state instead of guessing.
function resolveImpostorVotes(PDO $db, string $code, int $round): void {
    $tallyStmt = $db->prepare("SELECT target_device_id, COUNT(*) AS cnt FROM impostor_votes WHERE room_code = ? AND round = ? GROUP BY target_device_id");
    $tallyStmt->execute([$code, $round]);
    $rows = $tallyStmt->fetchAll();
    if (empty($rows)) {
        applyImpostorElimination($db, $code, null);
        return;
    }
    $maxCount = max(array_map(fn($r) => (int)$r['cnt'], $rows));
    $topRows = array_values(array_filter($rows, fn($r) => (int)$r['cnt'] === $maxCount));
    if (count($topRows) === 1) {
        applyImpostorElimination($db, $code, $topRows[0]['target_device_id']);
    } else {
        $db->prepare("UPDATE rooms SET status = 'imp_tiebreak', updated_at = ? WHERE code = ?")->execute([nowMs(), $code]);
    }
}

/* ------------------------------------------------------------
   SKETCH & GUESS - shared helpers
   Turn order is the join order of contestants, fixed at start_game
   and never re-shuffled per round. The current drawer is derived
   from draw_round (1-based, monotonic across the whole game) rather
   than storing a separate turn-index column - draw_round also
   doubles as the score-feed/round number shown to players.
   Like submit_answer.php's is_correct flag, guess correctness is
   judged client-side (against js/drawing_words.js, which every
   client already has) and the server simply trusts and records it -
   the word index is never secret in a way that matters since the
   full word bank ships to every client regardless of role.
   ------------------------------------------------------------ */
const DRAW_GUESS_POINTS = [300, 200, 100]; // rank 1/2/3; rank 4+ gets nothing
const DRAW_DRAWER_BONUS = 50; // per correct guesser, capped at the first 3
const DRAW_ROUND_TIME_LIMIT = 75; // seconds for draw_active before auto-reveal

function drawTurnOrderOf(array $room): array {
    return json_decode($room['draw_turn_order'] ?? '[]', true) ?: [];
}

function currentDrawerId(array $room): ?string {
    $order = drawTurnOrderOf($room);
    if (empty($order)) return null;
    $idx = ((int)$room['draw_round'] - 1) % count($order);
    return $order[$idx];
}

// Ends the current drawing round (called once draw_active should advance to
// draw_reveal, whether triggered by the timer, by 3 correct guesses already
// recorded, or by the host's force-advance) and decides whether the whole
// game is finished or there's another turn to take.
function finishDrawRound(PDO $db, string $code): void {
    $db->prepare("UPDATE rooms SET status = 'draw_reveal', updated_at = ? WHERE code = ?")->execute([nowMs(), $code]);
}

function advanceDrawTurn(PDO $db, string $code): void {
    $now = nowMs();
    $roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
    $roomStmt->execute([$code]);
    $room = $roomStmt->fetch();
    if (!$room) return;
    $order = drawTurnOrderOf($room);
    $nextRound = (int)$room['draw_round'] + 1;
    $totalTurns = count($order) * max(1, (int)$room['draw_rounds_total']);
    if (empty($order) || $nextRound > $totalTurns) {
        $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")->execute([$now, $code]);
        return;
    }
    $choiceIndices = pickDrawWordChoices();
    $db->prepare("UPDATE rooms SET status = 'draw_choose', draw_round = ?, draw_word_choice_indices = ?, draw_word_idx = -1, updated_at = ? WHERE code = ?")
       ->execute([$nextRound, json_encode($choiceIndices), $now, $code]);
}

// js/drawing_words.js DrawingWords.WORDS currently has 240 entries; kept in
// sync manually with that file and api/drawing_words.php's DRAW_WORDS mirror.
const DRAW_WORD_BANK_SIZE = 240;

function pickDrawWordChoices(): array {
    $pool = range(0, DRAW_WORD_BANK_SIZE - 1);
    shuffle($pool);
    return array_slice($pool, 0, 4);
}
