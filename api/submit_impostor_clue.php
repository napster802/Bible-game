<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$round    = (int)($input['round'] ?? -1);
$clue     = trim($input['clue'] ?? '');

if (!$code || !$deviceId || $round < 0 || $clue === '') jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'imp_clue') jsonOut(['success' => false, 'error' => 'Not collecting clues'], 400);
if ((int)$room['impostor_round'] !== $round) jsonOut(['success' => false, 'error' => 'Wrong round'], 400);

$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ?");
$playerStmt->execute([$code, $deviceId]);
$playerRow = $playerStmt->fetch();
if (!$playerRow) jsonOut(['success' => false, 'error' => 'Not in this room'], 403);
if ((int)$playerRow['is_host'] === 1) jsonOut(['success' => false, 'error' => 'The host does not play'], 403);
if ((int)$playerRow['eliminated'] === 1) jsonOut(['success' => false, 'error' => 'You have been eliminated'], 403);

$checkStmt = $db->prepare("SELECT 1 FROM impostor_clues WHERE room_code = ? AND device_id = ? AND round = ?");
$checkStmt->execute([$code, $deviceId, $round]);
if ($checkStmt->fetchColumn()) jsonOut(['success' => false, 'error' => 'Already submitted a clue this round'], 400);

// One short word/phrase per clue - keeps the reveal screen scannable for everyone.
$clue = mb_substr($clue, 0, 40);

$db->prepare("INSERT OR IGNORE INTO impostor_clues (room_code, device_id, round, clue, submitted_at) VALUES (?, ?, ?, ?, ?)")
   ->execute([$code, $deviceId, $round, $clue, nowMs()]);

jsonOut(['success' => true]);
