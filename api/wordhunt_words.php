<?php
// Bible Word Hunt – word list, 10×20 grid generation, scoring.
// Grid is 10 cols × 20 rows = 200 cells.
// Words hidden in 8 directions: →←↓↑↘↙↗↖

require_once __DIR__ . '/scrabble_words.php';

const WH_ROWS = 20;
const WH_COLS = 10;
const WH_CELLS = 200; // WH_ROWS * WH_COLS

// Eight placement directions as [dr, dc]
const WH_DIRS = [
    [0,  1],  // →  right
    [0, -1],  // ←  left
    [1,  0],  // ↓  down
    [-1, 0],  // ↑  up
    [1,  1],  // ↘  down-right
    [1, -1],  // ↙  down-left
    [-1, 1],  // ↗  up-right
    [-1,-1],  // ↖  up-left
];

// Categories per round
const WORDHUNT_ROUND_CATS = [
    1 => ['book', 'place'],
    2 => ['character'],
    3 => ['concept', 'object', 'animal', 'book', 'place', 'character'],
];

// Base score by word length (3–9 chars)
const WORDHUNT_LENGTH_SCORES = [3 => 5, 4 => 8, 5 => 12, 6 => 16, 7 => 22, 8 => 28, 9 => 30];

// Filler letters biased toward common Bible letters
const WORDHUNT_FILLER = 'AAAEEEIIILNNOOOSSTTTHHRRV';

function wordhuntEligibleWords(): array {
    return array_values(array_filter(SCRAB_WORDS, fn($w) => mb_strlen($w[0]) >= 3 && mb_strlen($w[0]) <= 9));
}

function wordhuntSelectWords(int $round): array {
    $cats = WORDHUNT_ROUND_CATS[$round] ?? WORDHUNT_ROUND_CATS[3];
    $eligible = array_values(array_filter(wordhuntEligibleWords(), fn($w) => in_array($w[1], $cats, true)));
    if (count($eligible) < 12) $eligible = wordhuntEligibleWords();
    $target = random_int(18, 24); // more words for the bigger 10×20 grid
    shuffle($eligible);
    return array_slice($eligible, 0, $target);
}

/**
 * Build a 10×20 grid with hidden words placed in all 8 directions.
 * Returns ['grid' => string[200], 'words' => [{word,cat,note,row,col,dr,dc}]]
 */
function wordhuntBuildGrid(array $wordEntries): array {
    $grid   = array_fill(0, WH_CELLS, null);
    $placed = [];

    // Sort longest first for better placement success
    usort($wordEntries, fn($a, $b) => mb_strlen($b[0]) - mb_strlen($a[0]));

    foreach ($wordEntries as $entry) {
        $word = strtoupper($entry[0]);
        $len  = mb_strlen($word);

        $placed_ok = false;
        for ($attempt = 0; $attempt < 200; $attempt++) {
            $dir = WH_DIRS[random_int(0, 7)];
            [$dr, $dc] = $dir;

            // Compute valid starting bounds for this direction and word length
            $rowMin = 0;
            $rowMax = WH_ROWS - 1;
            $colMin = 0;
            $colMax = WH_COLS - 1;

            if ($dr > 0) $rowMax = WH_ROWS - $len;
            if ($dr < 0) $rowMin = $len - 1;
            if ($dc > 0) $colMax = WH_COLS - $len;
            if ($dc < 0) $colMin = $len - 1;

            if ($rowMin > $rowMax || $colMin > $colMax) continue;

            $row = random_int($rowMin, $rowMax);
            $col = random_int($colMin, $colMax);

            // Check if cells are free or already contain the correct letter
            $fits = true;
            for ($i = 0; $i < $len; $i++) {
                $r = $row + $i * $dr;
                $c = $col + $i * $dc;
                $idx = $r * WH_COLS + $c;
                if ($grid[$idx] !== null && $grid[$idx] !== $word[$i]) {
                    $fits = false;
                    break;
                }
            }

            if ($fits) {
                for ($i = 0; $i < $len; $i++) {
                    $r = $row + $i * $dr;
                    $c = $col + $i * $dc;
                    $grid[$r * WH_COLS + $c] = $word[$i];
                }
                $placed[] = [
                    'word' => $word,
                    'cat'  => $entry[1],
                    'note' => $entry[2],
                    'row'  => $row,
                    'col'  => $col,
                    'dr'   => $dr,
                    'dc'   => $dc,
                ];
                $placed_ok = true;
                break;
            }
        }
        // Skip word if it couldn't be placed after 200 attempts
    }

    // Fill empty cells with filler letters
    $filler = str_split(WORDHUNT_FILLER);
    for ($i = 0; $i < WH_CELLS; $i++) {
        if ($grid[$i] === null) {
            $grid[$i] = $filler[array_rand($filler)];
        }
    }

    return ['grid' => $grid, 'words' => $placed];
}

function wordhuntScoreWord(string $word): int {
    $len = max(3, min(9, mb_strlen($word)));
    return WORDHUNT_LENGTH_SCORES[$len] ?? 5;
}

// Returns the device_id of the player whose turn it is (turn mode).
function wordhuntCurrentPlayerId(array $room): ?string {
    $order = json_decode($room['wordhunt_turn_order'] ?? '[]', true) ?: [];
    if (empty($order)) return null;
    $idx = ((int)$room['wordhunt_turn_idx']) % count($order);
    return $order[$idx];
}

// Advance to next player's turn (turn mode).
function wordhuntAdvanceTurn(PDO $db, string $code, array $room): void {
    $newIdx = (int)$room['wordhunt_turn_idx'] + 1;
    $db->prepare("UPDATE rooms SET wordhunt_turn_idx = ?, wordhunt_turn_start = ?, wordhunt_pass_streak = 0, updated_at = ? WHERE code = ?")
       ->execute([$newIdx, nowMs(), nowMs(), $code]);
}

// End the current round.
function wordhuntEndRound(PDO $db, string $code): void {
    $db->prepare("UPDATE rooms SET status = 'wordhunt_round_result', updated_at = ? WHERE code = ? AND status = 'wordhunt_active'")
       ->execute([nowMs(), $code]);
}
