<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/wordhunt_words.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$cells    = $input['cells'] ?? [];   // [{row, col}, …] ordered first→last

if (!$code || !$deviceId || !is_array($cells) || count($cells) < 3) {
    jsonOut(['success' => false, 'error' => 'Missing params'], 400);
}

$db = getDB();

// Verify player is in this room
$playerStmt = $db->prepare("SELECT * FROM players WHERE room_code = ? AND device_id = ? AND is_host = 0");
$playerStmt->execute([$code, $deviceId]);
$player = $playerStmt->fetch();
if (!$player) jsonOut(['success' => false, 'error' => 'Not in this room'], 403);

// Get room
$roomStmt = $db->prepare("SELECT * FROM rooms WHERE code = ?");
$roomStmt->execute([$code]);
$room = $roomStmt->fetch();
if (!$room || $room['status'] !== 'wordhunt_active') {
    jsonOut(['success' => false, 'error' => 'Game not active'], 400);
}

$round = (int)$room['wordhunt_round'];
$mode  = $room['wordhunt_mode'] ?? 'race';
$now   = nowMs();

// Turn mode: verify it's this player's turn
if ($mode === 'turn') {
    $currentId = wordhuntCurrentPlayerId($room);
    if ($currentId !== $deviceId) {
        jsonOut(['success' => false, 'error' => 'Not your turn'], 400);
    }
}

// Load grid
$grid = json_decode($room['wordhunt_grid'] ?? '[]', true) ?: [];
if (count($grid) !== 100) jsonOut(['success' => false, 'error' => 'Invalid game state'], 400);

// Bounds-check each cell
foreach ($cells as $cell) {
    $r = (int)($cell['row'] ?? -1);
    $c = (int)($cell['col'] ?? -1);
    if ($r < 0 || $r > 9 || $c < 0 || $c > 9) {
        jsonOut(['success' => false, 'error' => 'Cell out of bounds'], 400);
    }
}

// Determine direction (all same row → horizontal; all same col → vertical)
$rows = array_map(fn($c) => (int)$c['row'], $cells);
$cols = array_map(fn($c) => (int)$c['col'], $cells);
$allSameRow = count(array_unique($rows)) === 1;
$allSameCol = count(array_unique($cols)) === 1;

if (!$allSameRow && !$allSameCol) {
    jsonOut(['success' => false, 'error' => 'Swipe in a straight line only'], 400);
}

// Normalise to ascending order (so swipe direction doesn't matter)
if ($allSameRow) {
    usort($cells, fn($a, $b) => (int)$a['col'] - (int)$b['col']);
    $sortedCols = array_column($cells, 'col');
    if (count(array_unique($sortedCols)) !== count($sortedCols)) {
        jsonOut(['success' => false, 'error' => 'Duplicate cells'], 400);
    }
} else {
    usort($cells, fn($a, $b) => (int)$a['row'] - (int)$b['row']);
    $sortedRows = array_column($cells, 'row');
    if (count(array_unique($sortedRows)) !== count($sortedRows)) {
        jsonOut(['success' => false, 'error' => 'Duplicate cells'], 400);
    }
}

// Verify cells are consecutive (no gaps)
if ($allSameRow) {
    $minC = (int)$cells[0]['col'];
    $maxC = (int)$cells[count($cells) - 1]['col'];
    if ($maxC - $minC + 1 !== count($cells)) {
        jsonOut(['success' => false, 'error' => 'Cells not consecutive'], 400);
    }
} else {
    $minR = (int)$cells[0]['row'];
    $maxR = (int)$cells[count($cells) - 1]['row'];
    if ($maxR - $minR + 1 !== count($cells)) {
        jsonOut(['success' => false, 'error' => 'Cells not consecutive'], 400);
    }
}

// Extract word from grid at those cells
$word = '';
foreach ($cells as $cell) {
    $word .= $grid[(int)$cell['row'] * 10 + (int)$cell['col']] ?? '';
}
$word = strtoupper($word);

// Verify word is in this round's word list and matches position
$wordsList = json_decode($room['wordhunt_words'] ?? '[]', true) ?: [];
$wordData  = null;
foreach ($wordsList as $w) {
    if ($w['word'] !== $word) continue;
    // Must start at the right cell
    $startRow = (int)$cells[0]['row'];
    $startCol = (int)$cells[0]['col'];
    if ((int)$w['row'] === $startRow && (int)$w['col'] === $startCol) {
        $wordData = $w;
        break;
    }
}

if (!$wordData) {
    jsonOut(['success' => false, 'error' => 'Not a Bible word — keep searching!'], 400);
}

// Compute base score
$baseScore   = wordhuntScoreWord($word);
$bonus       = null;
$bonusPoints = 0;

// First Light: first claim in this round
$claimCountStmt = $db->prepare("SELECT COUNT(*) FROM wordhunt_claims WHERE room_code = ? AND round = ?");
$claimCountStmt->execute([$code, $round]);
$claimCount = (int)$claimCountStmt->fetchColumn();

if ($claimCount === 0) {
    $bonus       = '🌅 First Light';
    $bonusPoints = 20;
} elseif (($now - (int)$room['wordhunt_round_start']) <= 5000) {
    // Speed Demon: found in first 5 s (only if not also First Light)
    $bonus       = '⚡ Speed Demon';
    $bonusPoints = 10;
}

$totalScore = $baseScore + $bonusPoints;

// Insert claim — UNIQUE(room_code, round, word) ensures first write wins
try {
    $db->prepare("INSERT INTO wordhunt_claims (room_code, device_id, round, word, score, cells, bonus, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([$code, $deviceId, $round, $word, $totalScore, json_encode($cells), $bonus, $now]);
} catch (PDOException $e) {
    jsonOut(['success' => false, 'error' => 'Already claimed by another player!'], 400);
}

// Award points to player
$db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
   ->execute([$totalScore, $code, $deviceId]);

$newClaimCount = $claimCount + 1;

if ($mode === 'turn') {
    wordhuntAdvanceTurn($db, $code, $room);
} else {
    // Race mode: end round immediately if all words found
    if ($newClaimCount >= count($wordsList)) {
        wordhuntEndRound($db, $code);
    } else {
        $db->prepare("UPDATE rooms SET updated_at = ? WHERE code = ?")->execute([$now, $code]);
    }
}

jsonOut(['success' => true, 'word' => $word, 'score' => $totalScore, 'bonus' => $bonus, 'note' => $wordData['note'] ?? '']);
