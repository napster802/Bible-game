<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input     = getInput();
$code      = trim($input['room_code'] ?? '');
$deviceId  = trim($input['device_id'] ?? '');
$round     = (int)($input['round'] ?? -1);
$points    = $input['points'] ?? [];
$color     = trim($input['color'] ?? '#000000');
$lineWidth = (int)($input['line_width'] ?? 4);

if (!$code || !$deviceId || $round < 0 || !is_array($points) || empty($points)) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'draw_active') jsonOut(['success' => false, 'error' => 'Not drawing right now'], 400);
if ((int)$room['draw_round'] !== $round) jsonOut(['success' => false, 'error' => 'Wrong round'], 400);

if ($deviceId !== currentDrawerId($room)) jsonOut(['success' => false, 'error' => 'You are not the drawer this round'], 403);

// Clamp to keep a single malicious/buggy stroke payload from bloating the DB.
$points = array_slice($points, 0, 500);
$color = mb_substr($color, 0, 16);
$lineWidth = max(1, min(40, $lineWidth));

$db->prepare("INSERT INTO drawing_strokes (room_code, round, drawer_device_id, points, color, line_width, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
   ->execute([$code, $round, $deviceId, json_encode($points), $color, $lineWidth, nowMs()]);

jsonOut(['success' => true]);
