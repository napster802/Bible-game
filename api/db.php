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
    ");
    migrateSchema($db);
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
