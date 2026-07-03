<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$action   = trim($input['action'] ?? '');
$targetId = trim($input['target_device_id'] ?? '');

if (!$code || !$deviceId || !$action) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$roomStmt->execute([$code]);
$room = $roomStmt->fetch();
if (!$room) jsonOut(['success' => false, 'error' => 'Room not found'], 404);

if (!(int)$room['imp_classes_enabled']) jsonOut(['success' => false, 'error' => 'Classes not enabled'], 400);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$player = $playerStmt->fetch();
if (!$player) jsonOut(['success' => false, 'error' => 'Player not found'], 404);

$cls  = $player['imp_class'] ?? null;
$used = (int)($player['imp_class_used'] ?? 0);
$now  = nowMs();
$round = (int)$room['impostor_round'];

// Map each action to the required class
$actionClassMap = [
    'prophet_peek'   => 'prophet',
    'watchman_spot'  => 'watchman',
    'guardian_shield'=> 'guardian',
    'doctor_revive'  => 'doctor',
    'shadow_transfer'=> 'shadow',
    'mimic_peek'     => 'mimic',
    'saboteur_nullify'=> 'saboteur',
    'spy_tally'      => 'spy',
];

$requiredClass = $actionClassMap[$action] ?? null;
if (!$requiredClass) jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
if ($cls !== $requiredClass) jsonOut(['success' => false, 'error' => 'You do not have this class'], 403);
if ($used) jsonOut(['success' => false, 'error' => 'Ability already used'], 400);

$impostorIds = impostorIdsOf($room);
$isImpostor  = in_array($deviceId, $impostorIds, true);

function markUsed(PDO $db, string $code, string $deviceId): void {
    $db->prepare("UPDATE players SET imp_class_used = 1 WHERE room_code = ? AND device_id = ?")
       ->execute([$code, $deviceId]);
}

function requireTarget(string $targetId, string $actionName): void {
    if (!$targetId) jsonOut(['success' => false, 'error' => "target_device_id required for $actionName"], 400);
}

function getAlivePlayers(PDO $db, string $code): array {
    $stmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND is_host = 0 AND eliminated = 0");
    $stmt->execute([$code]);
    return $stmt->fetchAll();
}

switch ($action) {
    case 'prophet_peek':
        requireTarget($targetId, 'prophet_peek');
        // Target must be alive and not self
        if ($targetId === $deviceId) jsonOut(['success' => false, 'error' => 'Cannot peek yourself'], 400);
        $targetStmt = $db->prepare("SELECT name, eliminated FROM players WHERE room_code = ? AND device_id = ?");
        $targetStmt->execute([$code, $targetId]);
        $target = $targetStmt->fetch();
        if (!$target || (int)$target['eliminated']) jsonOut(['success' => false, 'error' => 'Target not found or eliminated'], 400);

        $isTargetImpostor = in_array($targetId, $impostorIds, true) ? 1 : 0;
        $db->prepare("INSERT OR REPLACE INTO imp_class_peeks (room_code, peeker_id, target_id, is_impostor, created_at) VALUES (?, ?, ?, ?, ?)")
           ->execute([$code, $deviceId, $targetId, $isTargetImpostor, $now]);
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true, 'result' => ['target_name' => $target['name'], 'is_impostor' => (bool)$isTargetImpostor]]);

    case 'watchman_spot':
        requireTarget($targetId, 'watchman_spot');
        if ($targetId === $deviceId) jsonOut(['success' => false, 'error' => 'Cannot spotlight yourself'], 400);
        $targetStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND device_id = ? AND eliminated = 0");
        $targetStmt->execute([$code, $targetId]);
        if (!$targetStmt->fetch()) jsonOut(['success' => false, 'error' => 'Target not found or eliminated'], 400);

        $db->prepare("UPDATE rooms SET imp_spotlight_id = ? WHERE code = ?")->execute([$targetId, $code]);
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true]);

    case 'guardian_shield':
        requireTarget($targetId, 'guardian_shield');
        $targetStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND device_id = ? AND eliminated = 0");
        $targetStmt->execute([$code, $targetId]);
        if (!$targetStmt->fetch()) jsonOut(['success' => false, 'error' => 'Target not found or eliminated'], 400);

        $db->prepare("UPDATE rooms SET imp_shielded_id = ? WHERE code = ?")->execute([$targetId, $code]);
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true]);

    case 'doctor_revive':
        requireTarget($targetId, 'doctor_revive');
        $targetStmt = $db->prepare("SELECT device_id, imp_class FROM players WHERE room_code = ? AND device_id = ? AND is_host = 0 AND eliminated = 1");
        $targetStmt->execute([$code, $targetId]);
        $target = $targetStmt->fetch();
        if (!$target) jsonOut(['success' => false, 'error' => 'Target is not an eliminated player'], 400);
        // Only crew can be revived
        if (in_array($targetId, $impostorIds, true)) jsonOut(['success' => false, 'error' => 'Cannot revive an impostor'], 400);

        $db->prepare("UPDATE players SET eliminated = 0 WHERE room_code = ? AND device_id = ?")
           ->execute([$code, $targetId]);
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true]);

    case 'shadow_transfer':
        requireTarget($targetId, 'shadow_transfer');
        if ($targetId === $deviceId) jsonOut(['success' => false, 'error' => 'Cannot transfer to yourself'], 400);
        // Target must be non-eliminated crew
        $targetStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND device_id = ? AND is_host = 0 AND eliminated = 0");
        $targetStmt->execute([$code, $targetId]);
        if (!$targetStmt->fetch()) jsonOut(['success' => false, 'error' => 'Target not found or eliminated'], 400);
        if (in_array($targetId, $impostorIds, true)) jsonOut(['success' => false, 'error' => 'Target is already an impostor'], 400);

        // Swap: replace Shadow's device_id with target in rooms impostor_id/impostor_id_2
        if ($room['impostor_id'] === $deviceId) {
            $db->prepare("UPDATE rooms SET impostor_id = ?, imp_shadow_new_id = ? WHERE code = ?")
               ->execute([$targetId, $targetId, $code]);
        } elseif ($room['impostor_id_2'] === $deviceId) {
            $db->prepare("UPDATE rooms SET impostor_id_2 = ?, imp_shadow_new_id = ? WHERE code = ?")
               ->execute([$targetId, $targetId, $code]);
        } else {
            jsonOut(['success' => false, 'error' => 'Shadow player not found as impostor'], 500);
        }
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true]);

    case 'mimic_peek':
        requireTarget($targetId, 'mimic_peek');
        if ($targetId === $deviceId) jsonOut(['success' => false, 'error' => 'Cannot peek yourself'], 400);
        $clueStmt = $db->prepare("SELECT clue FROM impostor_clues WHERE room_code = ? AND device_id = ? AND round = ?");
        $clueStmt->execute([$code, $targetId, $round]);
        $clueRow = $clueStmt->fetch();
        if (!$clueRow) jsonOut(['success' => false, 'error' => 'Target has not submitted a clue yet'], 400);

        $targetNameStmt = $db->prepare("SELECT name FROM players WHERE room_code = ? AND device_id = ?");
        $targetNameStmt->execute([$code, $targetId]);
        $targetName = $targetNameStmt->fetchColumn() ?: 'Unknown';

        $db->prepare("INSERT OR REPLACE INTO imp_mimic_peeks (room_code, mimic_id, target_id, clue, round, created_at) VALUES (?, ?, ?, ?, ?, ?)")
           ->execute([$code, $deviceId, $targetId, $clueRow['clue'], $round, $now]);
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true, 'result' => ['target_name' => $targetName, 'clue' => $clueRow['clue']]]);

    case 'saboteur_nullify':
        requireTarget($targetId, 'saboteur_nullify');
        if ($targetId === $deviceId) jsonOut(['success' => false, 'error' => 'Cannot nullify your own vote'], 400);
        $targetStmt = $db->prepare("SELECT device_id FROM players WHERE room_code = ? AND device_id = ? AND eliminated = 0");
        $targetStmt->execute([$code, $targetId]);
        if (!$targetStmt->fetch()) jsonOut(['success' => false, 'error' => 'Target not found or eliminated'], 400);

        $db->prepare("UPDATE rooms SET imp_nullified_vote_id = ? WHERE code = ?")->execute([$targetId, $code]);
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true]);

    case 'spy_tally':
        // No target needed — just return the current vote tally privately
        $tallyStmt = $db->prepare("SELECT v.target_device_id, p.name, p.avatar, SUM(v.vote_weight) AS cnt FROM impostor_votes v JOIN players p ON p.room_code = v.room_code AND p.device_id = v.target_device_id WHERE v.room_code = ? AND v.round = ? GROUP BY v.target_device_id ORDER BY cnt DESC");
        $tallyStmt->execute([$code, $round]);
        $tally = $tallyStmt->fetchAll();
        markUsed($db, $code, $deviceId);
        jsonOut(['success' => true, 'result' => ['tally' => $tally]]);

    default:
        jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
}
