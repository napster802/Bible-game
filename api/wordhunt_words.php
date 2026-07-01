<?php
// Bible Word Hunt – server-side word list, grid generation, and scoring.
// Words are drawn from the same SCRAB_WORDS array (scrabble_words.php),
// filtered to ≤9 characters so they fit inside a 10×10 grid.

require_once __DIR__ . '/scrabble_words.php';

// Categories included in each round
const WORDHUNT_ROUND_CATS = [
    1 => ['book', 'place'],
    2 => ['character'],
    3 => ['concept', 'object', 'animal', 'book', 'place', 'character'],
];

// Base point value by word length (3–9 chars)
const WORDHUNT_LENGTH_SCORES = [3 => 5, 4 => 8, 5 => 12, 6 => 16, 7 => 22, 8 => 28, 9 => 30];

// Common Bible letters for filler cells — biased to avoid accidental words
const WORDHUNT_FILLER = 'AAAEEEIIILNNOOOSSTTTHHRRV';

function wordhuntEligibleWords(): array {
    return array_values(array_filter(SCRAB_WORDS, fn($w) => mb_strlen($w[0]) >= 3 && mb_strlen($w[0]) <= 9));
}

function wordhuntSelectWords(int $round): array {
    $cats = WORDHUNT_ROUND_CATS[$round] ?? WORDHUNT_ROUND_CATS[3];
    $eligible = array_values(array_filter(wordhuntEligibleWords(), fn($w) => in_array($w[1], $cats, true)));

    if (count($eligible) < 12) {
        $eligible = wordhuntEligibleWords();
    }

    $target = random_int(15, 18);
    shuffle($eligible);
    return array_slice($eligible, 0, $target);
}

// Builds a 10×10 letter grid with hidden words.
// Returns ['grid' => string[100], 'words' => [{word,cat,note,row,col,dir}]]
function wordhuntBuildGrid(array $wordEntries): array {
    $grid = array_fill(0, 100, null);
    $placed = [];

    // Sort longest-first for better placement success
    usort($wordEntries, fn($a, $b) => mb_strlen($b[0]) - mb_strlen($a[0]));

    foreach ($wordEntries as $entry) {
        $word = strtoupper($entry[0]);
        $len  = mb_strlen($word);
        $placed_ok = false;

        for ($attempt = 0; $attempt < 120; $attempt++) {
            $dir = (random_int(0, 1) === 0) ? 'h' : 'v';

            if ($dir === 'h') {
                if ($len > 10) continue;
                $row = random_int(0, 9);
                $col = random_int(0, 10 - $len);
                $fits = true;
                for ($i = 0; $i < $len; $i++) {
                    $cell = $grid[$row * 10 + $col + $i];
                    if ($cell !== null && $cell !== $word[$i]) { $fits = false; break; }
                }
                if ($fits) {
                    for ($i = 0; $i < $len; $i++) {
                        $grid[$row * 10 + $col + $i] = $word[$i];
                    }
                    $placed[] = ['word' => $word, 'cat' => $entry[1], 'note' => $entry[2], 'row' => $row, 'col' => $col, 'dir' => 'h'];
                    $placed_ok = true;
                    break;
                }
            } else {
                if ($len > 10) continue;
                $row = random_int(0, 10 - $len);
                $col = random_int(0, 9);
                $fits = true;
                for ($i = 0; $i < $len; $i++) {
                    $cell = $grid[($row + $i) * 10 + $col];
                    if ($cell !== null && $cell !== $word[$i]) { $fits = false; break; }
                }
                if ($fits) {
                    for ($i = 0; $i < $len; $i++) {
                        $grid[($row + $i) * 10 + $col] = $word[$i];
                    }
                    $placed[] = ['word' => $word, 'cat' => $entry[1], 'note' => $entry[2], 'row' => $row, 'col' => $col, 'dir' => 'v'];
                    $placed_ok = true;
                    break;
                }
            }
        }
        // Skip word if it couldn't be placed after 120 attempts
    }

    // Fill remaining empty cells with filler letters
    $filler = str_split(WORDHUNT_FILLER);
    for ($i = 0; $i < 100; $i++) {
        if ($grid[$i] === null) {
            $grid[$i] = $filler[array_rand($filler)];
        }
    }

    return ['grid' => $grid, 'words' => $placed];
}

function wordhuntScoreWord(string $word): int {
    $len = mb_strlen($word);
    $len = max(3, min(9, $len));
    return WORDHUNT_LENGTH_SCORES[$len] ?? 5;
}

// Returns the device_id of the player whose turn it is in turn mode.
// Uses wordhunt_turn_idx (monotonically increasing) mod player count.
function wordhuntCurrentPlayerId(array $room): ?string {
    $order = json_decode($room['wordhunt_turn_order'] ?? '[]', true) ?: [];
    if (empty($order)) return null;
    $idx = ((int)$room['wordhunt_turn_idx']) % count($order);
    return $order[$idx];
}

// Advances to the next player's turn (turn mode).
function wordhuntAdvanceTurn(PDO $db, string $code, array $room): void {
    $newIdx = (int)$room['wordhunt_turn_idx'] + 1;
    $db->prepare("UPDATE rooms SET wordhunt_turn_idx = ?, wordhunt_turn_start = ?, wordhunt_pass_streak = 0, updated_at = ? WHERE code = ?")
       ->execute([$newIdx, nowMs(), nowMs(), $code]);
}

// Closes the current round (race mode: all found or time up; turn mode: all passed).
function wordhuntEndRound(PDO $db, string $code): void {
    $db->prepare("UPDATE rooms SET status = 'wordhunt_round_result', updated_at = ? WHERE code = ? AND status = 'wordhunt_active'")
       ->execute([nowMs(), $code]);
}
