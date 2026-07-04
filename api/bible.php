<?php
/* ------------------------------------------------------------
   KJV Bible reader API
   GET ?action=books            → [{book_num, book_name, testament, chapters}]
   GET ?action=text&book=N&ch=N → {book_name, testament, total_chapters, verses:[{verse,text}]}
   GET ?action=seed             → one-time data load (called automatically on first books request)
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

$action = trim($_GET['action'] ?? '');
$db = getDB();

ensureSeeded($db);

if ($action === 'books') {
    $rows = $db->query("
        SELECT book_num, book_name, testament, MAX(chapter) AS chapters
        FROM bible_kjv
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

    $stmt = $db->prepare("SELECT verse, text FROM bible_kjv WHERE book_num=? AND chapter=? ORDER BY verse");
    $stmt->execute([$bookNum, $chapter]);
    $verses = $stmt->fetchAll();
    foreach ($verses as &$v) $v['verse'] = (int)$v['verse'];

    $meta = $db->prepare("SELECT book_name, testament, MAX(chapter) AS total_ch FROM bible_kjv WHERE book_num=?");
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

jsonOut(['success' => false, 'error' => 'Unknown action'], 400);

/* ── Seed from bundled JSON on first use ──────────────────── */
function ensureSeeded(PDO $db): void {
    $count = (int)$db->query("SELECT COUNT(*) FROM bible_kjv")->fetchColumn();
    if ($count > 0) return;

    $jsonPath = __DIR__ . '/../bible/en_kjv.json';
    if (!file_exists($jsonPath)) {
        // Try to download
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
