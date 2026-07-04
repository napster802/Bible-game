<?php
/* ------------------------------------------------------------
   Admin dashboard backend.
   All actions require the correct passcode in the POST body.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$action   = trim($input['action']   ?? '');
$passcode = trim($input['passcode'] ?? '');

if ($passcode !== '12345678') {
    jsonOut(['success' => false, 'error' => 'Unauthorized'], 401);
}

$db = getDB();

// ------------------------------------------------------------------ get_stats
if ($action === 'get_stats') {
    $totalPlayers = (int)$db->query("SELECT COUNT(*) FROM profiles")->fetchColumn();
    $totalGames   = (int)$db->query("SELECT COUNT(*) FROM rooms")->fetchColumn();

    $onlineCutoff = nowMs() - 30000;
    $stmt = $db->prepare("SELECT COUNT(DISTINCT device_id) FROM players WHERE last_ping > ?");
    $stmt->execute([$onlineCutoff]);
    $onlinePlayers = (int)$stmt->fetchColumn();

    $totalWallet = (int)$db->query("SELECT COALESCE(SUM(wallet), 0) FROM profiles")->fetchColumn();

    jsonOut([
        'success'         => true,
        'total_players'   => $totalPlayers,
        'total_games'     => $totalGames,
        'online_players'  => $onlinePlayers,
        'total_wallet'    => $totalWallet,
    ]);
}

// ----------------------------------------------------------------- get_players
if ($action === 'get_players') {
    $stmt = $db->query("
        SELECT
            p.device_id,
            p.name,
            p.avatar,
            p.avatar_type,
            p.wallet,
            p.updated_at,
            (SELECT COUNT(*) FROM players pl WHERE pl.device_id = p.device_id) AS total_games,
            (SELECT MAX(pl2.last_ping) FROM players pl2 WHERE pl2.device_id = p.device_id) AS last_ping
        FROM profiles p
        ORDER BY p.wallet DESC
        LIMIT 200
    ");
    $rows = $stmt->fetchAll();

    // Cast numeric fields so JSON encodes them as numbers, not strings.
    foreach ($rows as &$row) {
        $row['wallet']      = (int)$row['wallet'];
        $row['updated_at']  = (int)$row['updated_at'];
        $row['total_games'] = (int)$row['total_games'];
        $row['last_ping']   = $row['last_ping'] !== null ? (int)$row['last_ping'] : null;
    }
    unset($row);

    jsonOut(['success' => true, 'players' => $rows]);
}

// --------------------------------------------------------------- adjust_points
if ($action === 'adjust_points') {
    $deviceId = trim($input['device_id'] ?? '');
    $amount   = isset($input['amount']) ? (int)$input['amount'] : null;

    if (!$deviceId)        jsonOut(['success' => false, 'error' => 'Missing device_id'], 400);
    if ($amount === null)  jsonOut(['success' => false, 'error' => 'Missing amount'],    400);

    $stmt = $db->prepare("UPDATE profiles SET wallet = MAX(0, wallet + ?) WHERE device_id = ?");
    $stmt->execute([$amount, $deviceId]);

    if ($stmt->rowCount() === 0) {
        jsonOut(['success' => false, 'error' => 'Player not found'], 404);
    }

    $walletStmt = $db->prepare("SELECT wallet FROM profiles WHERE device_id = ?");
    $walletStmt->execute([$deviceId]);
    $newWallet = (int)$walletStmt->fetchColumn();

    jsonOut(['success' => true, 'wallet' => $newWallet]);
}

// --------------------------------------------------------------- delete_player
if ($action === 'delete_player') {
    $deviceId = trim($input['device_id'] ?? '');

    if (!$deviceId) jsonOut(['success' => false, 'error' => 'Missing device_id'], 400);

    $db->prepare("DELETE FROM profiles WHERE device_id = ?")->execute([$deviceId]);
    $db->prepare("DELETE FROM players  WHERE device_id = ?")->execute([$deviceId]);

    jsonOut(['success' => true]);
}

// ----------------------------------------------------------------- unknown action
jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
