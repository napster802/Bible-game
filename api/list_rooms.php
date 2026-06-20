<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$db = getDB();
cleanStale($db);

$stmt = $db->query("
    SELECT r.code, r.game_format, r.created_at,
           (SELECT name FROM players WHERE room_code = r.code AND is_host = 1 LIMIT 1) AS host_name,
           (SELECT COUNT(*) FROM players WHERE room_code = r.code AND is_host = 0) AS player_count
    FROM rooms r
    WHERE r.status = 'lobby'
    ORDER BY r.created_at DESC
    LIMIT 30
");
$rooms = $stmt->fetchAll();

jsonOut(['success' => true, 'rooms' => $rooms]);
