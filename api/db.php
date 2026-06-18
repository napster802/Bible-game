<?php
define('DB_PATH', __DIR__ . '/../data/game.db');

function getDB(): PDO {
    static $db = null;
    if ($db === null) {
        $dir = dirname(DB_PATH);
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL');
        $db->exec('PRAGMA synchronous=NORMAL');
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
    ");
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
