<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input     = getInput();
$code      = trim($input['room_code'] ?? '');
$deviceId  = trim($input['device_id'] ?? '');
$round     = (int)($input['round'] ?? -1);
$choiceIdx = (int)($input['choice_idx'] ?? -1);

if (!$code || !$deviceId || $round < 0 || $choiceIdx < 0) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

$stmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$stmt->execute([$code]);
$room = $stmt->fetch();
if (!$room || $room['status'] !== 'draw_choose') jsonOut(['success' => false, 'error' => 'Not choosing a word'], 400);
if ((int)$room['draw_round'] !== $round) jsonOut(['success' => false, 'error' => 'Wrong round'], 400);

if ($deviceId !== currentDrawerId($room)) jsonOut(['success' => false, 'error' => 'You are not the drawer this round'], 403);

$choices = json_decode($room['draw_word_choice_indices'], true) ?: [];
if (!in_array($choiceIdx, $choices, true)) jsonOut(['success' => false, 'error' => 'Not one of your offered choices'], 400);

$now = nowMs();
$db->prepare("UPDATE rooms SET status = 'draw_active', draw_word_idx = ?, draw_round_start_time = ?, updated_at = ? WHERE code = ?")
   ->execute([$choiceIdx, $now, $now, $code]);

jsonOut(['success' => true]);
