<?php
/* ------------------------------------------------------------
   Hall of Fame leaderboards: Top 10 players per game mode, plus
   an Overall ranking. Both are built from leaderboard_stats, a
   lifetime accumulator that only ever grows (see room_state.php's
   wallet-crediting block) - unlike profiles.wallet, it is never
   reduced by shop purchases, so spending points doesn't drop a
   player's rank here.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$db = getDB();

$formats = ['classic', 'truefalse', 'scramble', 'survival', 'memory', 'twotruths', 'higherlower', 'versefill', 'emojiclue', 'impostor', 'scrab'];

$leaderboards = [];

foreach ($formats as $fmt) {
    $stmt = $db->prepare("
        SELECT ls.device_id, pr.name, pr.avatar, pr.avatar_type, ls.total_points AS points
        FROM leaderboard_stats ls
        JOIN profiles pr ON pr.device_id = ls.device_id
        WHERE ls.game_format = ? AND ls.total_points > 0
        ORDER BY ls.total_points DESC
        LIMIT 10
    ");
    $stmt->execute([$fmt]);
    $leaderboards[$fmt] = $stmt->fetchAll();
}

$overallStmt = $db->query("
    SELECT ls.device_id, pr.name, pr.avatar, pr.avatar_type, SUM(ls.total_points) AS points
    FROM leaderboard_stats ls
    JOIN profiles pr ON pr.device_id = ls.device_id
    GROUP BY ls.device_id
    HAVING SUM(ls.total_points) > 0
    ORDER BY points DESC
    LIMIT 10
");
$leaderboards['overall'] = $overallStmt->fetchAll();

jsonOut(['success' => true, 'leaderboards' => $leaderboards]);
