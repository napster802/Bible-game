<?php
/* ------------------------------------------------------------
   KJV Bible reader API (multi-version)
   GET ?action=books&version=kjv           → [{book_num, book_name, testament, chapters}]
   GET ?action=text&book=N&ch=N&version=X  → {book_name, testament, total_chapters, verses:[{verse,text}]}
   GET ?action=search&q=X&version=X        → {results, total, query}
   version: 'kjv' (default) | 'abhil82'
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

$action  = trim($_GET['action'] ?? '');
$version = trim($_GET['version'] ?? 'kjv');
if (!in_array($version, ['kjv', 'abhil82'], true)) $version = 'kjv';
$table   = ($version === 'abhil82') ? 'bible_abhil82' : 'bible_kjv';

$db = getDB();

ensureSeeded($db);
if ($version === 'abhil82') {
    set_time_limit(120);
    ensureSeededAbhil82($db);
}

if ($action === 'books') {
    $rows = $db->query("
        SELECT book_num, book_name, testament, MAX(chapter) AS chapters
        FROM $table
        GROUP BY book_num
        ORDER BY book_num
    ")->fetchAll();
    foreach ($rows as &$r) {
        $r['book_num']  = (int)$r['book_num'];
        $r['chapters']  = (int)$r['chapters'];
    }
    jsonOut(['success' => true, 'books' => $rows]);
}

if ($action === 'text') {
    $bookNum = (int)($_GET['book'] ?? 0);
    $chapter = (int)($_GET['ch']   ?? 0);
    if ($bookNum < 1 || $chapter < 1) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

    $stmt = $db->prepare("SELECT verse, text FROM $table WHERE book_num=? AND chapter=? ORDER BY verse");
    $stmt->execute([$bookNum, $chapter]);
    $verses = $stmt->fetchAll();
    foreach ($verses as &$v) $v['verse'] = (int)$v['verse'];

    $meta = $db->prepare("SELECT book_name, testament, MAX(chapter) AS total_ch FROM $table WHERE book_num=?");
    $meta->execute([$bookNum]);
    $m = $meta->fetch();

    jsonOut([
        'success'        => true,
        'book_name'      => $m['book_name'],
        'testament'      => $m['testament'],
        'total_chapters' => (int)$m['total_ch'],
        'verses'         => $verses,
    ]);
}

if ($action === 'search') {
    $q = trim($_GET['q'] ?? '');
    if (mb_strlen($q) < 2) jsonOut(['success' => false, 'error' => 'Query too short'], 400);
    $stmt = $db->prepare("
        SELECT book_num, book_name, testament, chapter, verse, text
        FROM $table
        WHERE text LIKE ?
        ORDER BY book_num, chapter, verse
        LIMIT 100
    ");
    $stmt->execute(['%' . $q . '%']);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['book_num'] = (int)$r['book_num'];
        $r['chapter']  = (int)$r['chapter'];
        $r['verse']    = (int)$r['verse'];
    }
    unset($r);
    $cntStmt = $db->prepare("SELECT COUNT(*) FROM $table WHERE text LIKE ?");
    $cntStmt->execute(['%' . $q . '%']);
    $total = (int)$cntStmt->fetchColumn();
    jsonOut(['success' => true, 'results' => $rows, 'total' => $total, 'query' => $q]);
}

jsonOut(['success' => false, 'error' => 'Unknown action'], 400);

/* ── Seed KJV from bundled JSON on first use ──────────────────── */
function ensureSeeded(PDO $db): void {
    $count = (int)$db->query("SELECT COUNT(*) FROM bible_kjv")->fetchColumn();
    if ($count > 0) return;

    $jsonPath = __DIR__ . '/../bible/en_kjv.json';
    if (!file_exists($jsonPath)) {
        $url = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json';
        $ctx = stream_context_create(['http' => ['timeout' => 60]]);
        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false) return;
        @file_put_contents($jsonPath, $raw);
    } else {
        $raw = file_get_contents($jsonPath);
    }

    $data = json_decode(ltrim($raw, "\xef\xbb\xbf"), true);
    if (!$data) return;

    $db->exec('BEGIN');
    $stmt = $db->prepare("INSERT INTO bible_kjv(book_num,book_name,testament,chapter,verse,text) VALUES(?,?,?,?,?,?)");
    foreach ($data as $bi => $book) {
        $num      = $bi + 1;
        $name     = $book['name'];
        $testament = ($num <= 39) ? 'OT' : 'NT';
        foreach ($book['chapters'] as $ci => $verses) {
            $ch = $ci + 1;
            foreach ($verses as $vi => $text) {
                $stmt->execute([$num, $name, $testament, $ch, $vi + 1, $text]);
            }
        }
    }
    $db->exec('COMMIT');
}

/* ── Seed ABHIL82 from local file or download ─────────────────── */
function ensureSeededAbhil82(PDO $db): void {
    $jsonPath = __DIR__ . '/../bible/abhil82.json';

    $count = (int)$db->query("SELECT COUNT(*) FROM bible_abhil82")->fetchColumn();
    if ($count > 0) {
        // If the JSON file exists, check whether it changed (e.g. replaced with real ABHIL82).
        // Compare the first verse in the DB against the first verse in the file.
        if (file_exists($jsonPath)) {
            $raw  = @file_get_contents($jsonPath);
            $data = $raw ? json_decode(ltrim($raw, "\xef\xbb\xbf"), true) : null;
            $fileFirstVerse = '';
            if (is_array($data)) {
                if (isset($data[0]['chapters'][0][0])) {
                    // thiagobodruk format
                    $fileFirstVerse = trim((string)$data[0]['chapters'][0][0]);
                } elseif (isset($data['books'][0]['chapters'][0]['verses'][0]['text'])) {
                    // scrollmapper format
                    $fileFirstVerse = trim((string)$data['books'][0]['chapters'][0]['verses'][0]['text']);
                }
            }
            if ($fileFirstVerse) {
                $dbFirst = (string)$db->query(
                    "SELECT text FROM bible_abhil82 WHERE book_num=1 AND chapter=1 AND verse=1 LIMIT 1"
                )->fetchColumn();
                if (trim($dbFirst) === $fileFirstVerse) return; // same data, nothing to do
                // File changed — clear and re-seed with new data
                $db->exec("DELETE FROM bible_abhil82");
            }
        } else {
            return; // no file, keep existing rows
        }
    }

    if (!file_exists($jsonPath)) {
        // Fallback download if file missing entirely (dev convenience only)
        $ctx = stream_context_create(['http' => ['timeout' => 60]]);
        $raw = @file_get_contents(
            'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/TagAngBiblia.json',
            false, $ctx
        );
        if (!$raw || strlen($raw) < 1000) return;
        @file_put_contents($jsonPath, $raw);
    }

    $raw  = file_get_contents($jsonPath);
    if ($raw === false) return;
    $data = json_decode(ltrim($raw, "\xef\xbb\xbf"), true);
    if (!$data) return;

    $db->exec('BEGIN');
    $stmt = $db->prepare("INSERT INTO bible_abhil82(book_num,book_name,testament,chapter,verse,text) VALUES(?,?,?,?,?,?)");

    // Handle two JSON formats:
    // scrollmapper: {"translation":..., "books":[{"name":..., "chapters":[{"chapter":N, "verses":[{"verse":N,"text":"..."}]}]}]}
    // thiagobodruk: [{"abbrev":..., "name":..., "chapters":[["verse1","verse2",...], ...]}]
    if (isset($data['books']) && is_array($data['books'])) {
        foreach ($data['books'] as $bi => $book) {
            $num       = $bi + 1;
            $name      = $book['name'];
            $testament = ($num <= 39) ? 'OT' : 'NT';
            foreach ($book['chapters'] as $ch) {
                $chNum = (int)$ch['chapter'];
                foreach ($ch['verses'] as $v) {
                    $stmt->execute([$num, $name, $testament, $chNum, (int)$v['verse'], trim((string)$v['text'])]);
                }
            }
        }
    } elseif (is_array($data) && isset($data[0]['chapters'])) {
        foreach ($data as $bi => $book) {
            $num       = $bi + 1;
            $name      = $book['name'];
            $testament = ($num <= 39) ? 'OT' : 'NT';
            foreach ($book['chapters'] as $ci => $verses) {
                $ch = $ci + 1;
                foreach ($verses as $vi => $text) {
                    $stmt->execute([$num, $name, $testament, $ch, $vi + 1, trim((string)$text)]);
                }
            }
        }
    }

    $db->exec('COMMIT');
}
