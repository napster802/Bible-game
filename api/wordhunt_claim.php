<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/wordhunt_words.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$input    = getInput();
$code     = trim($input['room_code'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$cells    = $input['cells'] ?? [];   // [{row, col}, …] in swipe order (first → last)

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

// Load grid (10×20 = 200 cells)
$grid = json_decode($room['wordhunt_grid'] ?? '[]', true) ?: [];
if (count($grid) !== WH_CELLS) {
    jsonOut(['success' => false, 'error' => 'Invalid game state'], 400);
}

// Bounds-check every submitted cell
foreach ($cells as $cell) {
    $r = (int)($cell['row'] ?? -1);
    $c = (int)($cell['col'] ?? -1);
    if ($r < 0 || $r >= WH_ROWS || $c < 0 || $c >= WH_COLS) {
        jsonOut(['success' => false, 'error' => 'Cell out of bounds'], 400);
    }
}

// Determine direction from the first two cells (keeps swipe order — no sorting)
$dr = (int)$cells[1]['row'] - (int)$cells[0]['row'];
$dc = (int)$cells[1]['col'] - (int)$cells[0]['col'];

// Must be one of the 8 unit vectors
$validDirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
if (!in_array([$dr, $dc], $validDirs, true)) {
    jsonOut(['success' => false, 'error' => 'Swipe in a straight line only'], 400);
}

// Verify every consecutive cell pair follows the same direction
for ($i = 1; $i < count($cells); $i++) {
    $stepDr = (int)$cells[$i]['row'] - (int)$cells[$i - 1]['row'];
    $stepDc = (int)$cells[$i]['col'] - (int)$cells[$i - 1]['col'];
    if ($stepDr !== $dr || $stepDc !== $dc) {
        jsonOut(['success' => false, 'error' => 'Not a straight line'], 400);
    }
}

// Extract word from grid in swipe order
$word = '';
foreach ($cells as $cell) {
    $word .= $grid[(int)$cell['row'] * WH_COLS + (int)$cell['col']] ?? '';
}
$word = strtoupper($word);

// Match against this round's hidden word list — start position AND direction must match
$wordsList = json_decode($room['wordhunt_words'] ?? '[]', true) ?: [];
$startRow  = (int)$cells[0]['row'];
$startCol  = (int)$cells[0]['col'];
$wordData  = null;
foreach ($wordsList as $w) {
    if ($w['word'] !== $word) continue;
    if ((int)$w['row'] === $startRow && (int)$w['col'] === $startCol
            && (int)$w['dr'] === $dr && (int)$w['dc'] === $dc) {
        $wordData = $w;
        break;
    }
}

if (!$wordData) {
    jsonOut(['success' => false, 'error' => 'Not a Bible word — keep searching!'], 400);
}

// Scoring
$baseScore   = wordhuntScoreWord($word);
$bonus       = null;
$bonusPoints = 0;

$claimCountStmt = $db->prepare("SELECT COUNT(*) FROM wordhunt_claims WHERE room_code = ? AND round = ?");
$claimCountStmt->execute([$code, $round]);
$claimCount = (int)$claimCountStmt->fetchColumn();

if ($claimCount === 0) {
    $bonus       = '🌅 First Light';
    $bonusPoints = 20;
} elseif (($now - (int)$room['wordhunt_round_start']) <= 5000) {
    $bonus       = '⚡ Speed Demon';
    $bonusPoints = 10;
}

$totalScore = $baseScore + $bonusPoints;

// INSERT — UNIQUE(room_code, round, word) ensures first-write wins in race mode
try {
    $db->prepare("INSERT INTO wordhunt_claims (room_code, device_id, round, word, score, cells, bonus, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([$code, $deviceId, $round, $word, $totalScore, json_encode($cells), $bonus, $now]);
} catch (PDOException $e) {
    jsonOut(['success' => false, 'error' => 'Already claimed by another player!'], 400);
}

// Award points
$db->prepare("UPDATE players SET score = score + ? WHERE room_code = ? AND device_id = ?")
   ->execute([$totalScore, $code, $deviceId]);

$newClaimCount = $claimCount + 1;

if ($mode === 'turn') {
    wordhuntAdvanceTurn($db, $code, $room);
} else {
    if ($newClaimCount >= count($wordsList)) {
        wordhuntEndRound($db, $code);
    } else {
        $db->prepare("UPDATE rooms SET updated_at = ? WHERE code = ?")->execute([$now, $code]);
    }
}

jsonOut(['success' => true, 'word' => $word, 'score' => $totalScore, 'bonus' => $bonus, 'note' => $wordData['note'] ?? '']);
