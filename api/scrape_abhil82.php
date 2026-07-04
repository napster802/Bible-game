<?php
/* ----------------------------------------------------------------
   ABHIL82 Bible scraper — fetches verse text from bible.com/bible/2191/
   Runs on device with direct internet access (no proxy needed).

   GET ?action=test               → connectivity test (fetches GEN.1)
   GET ?action=scrape&book=N      → fetch all chapters for book N (1-66)
   GET ?action=check              → returns which books are done
   GET ?action=finalize           → assemble JSON + clear DB for re-seed
   GET ?action=reset              → delete work files, start fresh
   ---------------------------------------------------------------- */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
header('Access-Control-Allow-Origin: *');

$action  = trim($_GET['action'] ?? 'check');
$workDir = __DIR__ . '/../bible/abhil82_work';

/* ── Book metadata ─────────────────────────────────────────────── */
$BOOKS = [
    ['abbrev'=>'GEN','name'=>'Genesis','chapters'=>50],
    ['abbrev'=>'EXO','name'=>'Exodus','chapters'=>40],
    ['abbrev'=>'LEV','name'=>'Leviticus','chapters'=>27],
    ['abbrev'=>'NUM','name'=>'Numbers','chapters'=>36],
    ['abbrev'=>'DEU','name'=>'Deuteronomy','chapters'=>34],
    ['abbrev'=>'JOS','name'=>'Joshua','chapters'=>24],
    ['abbrev'=>'JDG','name'=>'Judges','chapters'=>21],
    ['abbrev'=>'RUT','name'=>'Ruth','chapters'=>4],
    ['abbrev'=>'1SA','name'=>'1 Samuel','chapters'=>31],
    ['abbrev'=>'2SA','name'=>'2 Samuel','chapters'=>24],
    ['abbrev'=>'1KI','name'=>'1 Kings','chapters'=>22],
    ['abbrev'=>'2KI','name'=>'2 Kings','chapters'=>25],
    ['abbrev'=>'1CH','name'=>'1 Chronicles','chapters'=>29],
    ['abbrev'=>'2CH','name'=>'2 Chronicles','chapters'=>36],
    ['abbrev'=>'EZR','name'=>'Ezra','chapters'=>10],
    ['abbrev'=>'NEH','name'=>'Nehemiah','chapters'=>13],
    ['abbrev'=>'EST','name'=>'Esther','chapters'=>10],
    ['abbrev'=>'JOB','name'=>'Job','chapters'=>42],
    ['abbrev'=>'PSA','name'=>'Psalms','chapters'=>150],
    ['abbrev'=>'PRO','name'=>'Proverbs','chapters'=>31],
    ['abbrev'=>'ECC','name'=>'Ecclesiastes','chapters'=>12],
    ['abbrev'=>'SNG','name'=>'Song of Solomon','chapters'=>8],
    ['abbrev'=>'ISA','name'=>'Isaiah','chapters'=>66],
    ['abbrev'=>'JER','name'=>'Jeremiah','chapters'=>52],
    ['abbrev'=>'LAM','name'=>'Lamentations','chapters'=>5],
    ['abbrev'=>'EZK','name'=>'Ezekiel','chapters'=>48],
    ['abbrev'=>'DAN','name'=>'Daniel','chapters'=>12],
    ['abbrev'=>'HOS','name'=>'Hosea','chapters'=>14],
    ['abbrev'=>'JOL','name'=>'Joel','chapters'=>3],
    ['abbrev'=>'AMO','name'=>'Amos','chapters'=>9],
    ['abbrev'=>'OBA','name'=>'Obadiah','chapters'=>1],
    ['abbrev'=>'JON','name'=>'Jonah','chapters'=>4],
    ['abbrev'=>'MIC','name'=>'Micah','chapters'=>7],
    ['abbrev'=>'NAH','name'=>'Nahum','chapters'=>3],
    ['abbrev'=>'HAB','name'=>'Habakkuk','chapters'=>3],
    ['abbrev'=>'ZEP','name'=>'Zephaniah','chapters'=>3],
    ['abbrev'=>'HAG','name'=>'Haggai','chapters'=>2],
    ['abbrev'=>'ZEC','name'=>'Zechariah','chapters'=>14],
    ['abbrev'=>'MAL','name'=>'Malachi','chapters'=>4],
    ['abbrev'=>'MAT','name'=>'Matthew','chapters'=>28],
    ['abbrev'=>'MRK','name'=>'Mark','chapters'=>16],
    ['abbrev'=>'LUK','name'=>'Luke','chapters'=>24],
    ['abbrev'=>'JHN','name'=>'John','chapters'=>21],
    ['abbrev'=>'ACT','name'=>'Acts','chapters'=>28],
    ['abbrev'=>'ROM','name'=>'Romans','chapters'=>16],
    ['abbrev'=>'1CO','name'=>'1 Corinthians','chapters'=>16],
    ['abbrev'=>'2CO','name'=>'2 Corinthians','chapters'=>13],
    ['abbrev'=>'GAL','name'=>'Galatians','chapters'=>6],
    ['abbrev'=>'EPH','name'=>'Ephesians','chapters'=>6],
    ['abbrev'=>'PHP','name'=>'Philippians','chapters'=>4],
    ['abbrev'=>'COL','name'=>'Colossians','chapters'=>4],
    ['abbrev'=>'1TH','name'=>'1 Thessalonians','chapters'=>5],
    ['abbrev'=>'2TH','name'=>'2 Thessalonians','chapters'=>3],
    ['abbrev'=>'1TI','name'=>'1 Timothy','chapters'=>6],
    ['abbrev'=>'2TI','name'=>'2 Timothy','chapters'=>4],
    ['abbrev'=>'TIT','name'=>'Titus','chapters'=>3],
    ['abbrev'=>'PHM','name'=>'Philemon','chapters'=>1],
    ['abbrev'=>'HEB','name'=>'Hebrews','chapters'=>13],
    ['abbrev'=>'JAS','name'=>'James','chapters'=>5],
    ['abbrev'=>'1PE','name'=>'1 Peter','chapters'=>5],
    ['abbrev'=>'2PE','name'=>'2 Peter','chapters'=>3],
    ['abbrev'=>'1JN','name'=>'1 John','chapters'=>5],
    ['abbrev'=>'2JN','name'=>'2 John','chapters'=>1],
    ['abbrev'=>'3JN','name'=>'3 John','chapters'=>1],
    ['abbrev'=>'JUD','name'=>'Jude','chapters'=>1],
    ['abbrev'=>'REV','name'=>'Revelation','chapters'=>22],
];

/* ── action=test ───────────────────────────────────────────────── */
if ($action === 'test') {
    $result = fetchAndParse('GEN', 1);
    if (empty($result)) {
        echo json_encode(['success' => false, 'error' => 'Could not fetch Genesis 1 from bible.com. Check internet connection.']);
    } else {
        echo json_encode([
            'success'      => true,
            'verse_count'  => count($result),
            'first_verse'  => $result[0] ?? '',
            'message'      => 'bible.com is reachable. Ready to download ABHIL82.',
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

/* ── action=check ──────────────────────────────────────────────── */
if ($action === 'check') {
    $done = [];
    for ($i = 1; $i <= 66; $i++) {
        if (file_exists("$workDir/book_$i.json")) $done[] = $i;
    }
    $total_chapters = array_sum(array_column($BOOKS, 'chapters'));
    echo json_encode(['done_books' => $done, 'total_books' => 66, 'total_chapters' => $total_chapters]);
    exit;
}

/* ── action=reset ──────────────────────────────────────────────── */
if ($action === 'reset') {
    if (is_dir($workDir)) {
        foreach (glob("$workDir/book_*.json") as $f) @unlink($f);
    }
    echo json_encode(['success' => true, 'message' => 'Progress cleared. Ready to start fresh.']);
    exit;
}

/* ── action=scrape&book=N ──────────────────────────────────────── */
if ($action === 'scrape') {
    $bookNum = (int)($_GET['book'] ?? 0);
    if ($bookNum < 1 || $bookNum > 66) {
        echo json_encode(['success' => false, 'error' => 'book must be 1–66']);
        exit;
    }

    $book    = $BOOKS[$bookNum - 1];
    $abbrev  = $book['abbrev'];
    $outFile = "$workDir/book_$bookNum.json";

    // Already done — skip
    if (file_exists($outFile)) {
        $saved = json_decode(file_get_contents($outFile), true);
        echo json_encode([
            'success'  => true,
            'book'     => $bookNum,
            'name'     => $book['name'],
            'chapters' => count($saved['chapters'] ?? []),
            'cached'   => true,
        ]);
        exit;
    }

    if (!is_dir($workDir)) mkdir($workDir, 0755, true);

    set_time_limit(300);
    $chapters  = [];
    $errors    = 0;

    for ($ch = 1; $ch <= $book['chapters']; $ch++) {
        $verses = fetchAndParse($abbrev, $ch);
        if (empty($verses)) {
            $errors++;
            // Store empty placeholder so we don't skip it silently
            $chapters[] = [];
        } else {
            $chapters[] = $verses;
        }
        // Polite delay between requests
        if ($ch < $book['chapters']) usleep(120000); // 120ms
    }

    $payload = [
        'name'     => $book['name'],
        'abbrev'   => strtolower($abbrev),
        'chapters' => $chapters,
    ];
    file_put_contents($outFile, json_encode($payload, JSON_UNESCAPED_UNICODE));

    echo json_encode([
        'success'  => true,
        'book'     => $bookNum,
        'name'     => $book['name'],
        'chapters' => count($chapters),
        'errors'   => $errors,
    ]);
    exit;
}

/* ── action=finalize ───────────────────────────────────────────── */
if ($action === 'finalize') {
    // Check all books are present
    $missing = [];
    for ($i = 1; $i <= 66; $i++) {
        if (!file_exists("$workDir/book_$i.json")) $missing[] = $i;
    }
    if ($missing) {
        echo json_encode(['success' => false, 'error' => 'Missing books: ' . implode(',', $missing)]);
        exit;
    }

    // Assemble into thiagobodruk format: [{name, abbrev, chapters: [["v1","v2",...], ...]}, ...]
    $all = [];
    for ($i = 1; $i <= 66; $i++) {
        $book = json_decode(file_get_contents("$workDir/book_$i.json"), true);
        if (!$book) {
            echo json_encode(['success' => false, 'error' => "Corrupt data for book $i"]);
            exit;
        }
        $all[] = $book;
    }

    $jsonPath = __DIR__ . '/../bible/abhil82.json';
    $written  = file_put_contents($jsonPath, json_encode($all, JSON_UNESCAPED_UNICODE));
    if ($written === false) {
        echo json_encode(['success' => false, 'error' => 'Could not write bible/abhil82.json']);
        exit;
    }

    // Clear DB so ensureSeededAbhil82() re-seeds on next load
    $db = getDB();
    $db->exec("DELETE FROM bible_abhil82");

    // Clean up work files
    foreach (glob("$workDir/book_*.json") as $f) @unlink($f);

    $totalVerses = 0;
    foreach ($all as $book) {
        foreach ($book['chapters'] as $ch) $totalVerses += count($ch);
    }

    echo json_encode([
        'success'      => true,
        'total_verses' => $totalVerses,
        'file_bytes'   => $written,
        'message'      => 'ABHIL82 Bible downloaded and saved. Reload the app to use it.',
    ]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Unknown action']);
exit;

/* ── Fetch one chapter from bible.com and parse verse texts ──── */
function fetchAndParse(string $abbrev, int $chapter): array {
    $url = "https://www.bible.com/bible/2191/{$abbrev}.{$chapter}.ABHIL82";

    $ctx = stream_context_create([
        'http' => [
            'timeout'         => 30,
            'follow_location' => 1,
            'max_redirects'   => 5,
            'user_agent'      => 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
            'header'          => implode("\r\n", [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: fil-PH,fil;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding: identity',
                'Cache-Control: no-cache',
                'Referer: https://www.bible.com/',
            ]),
        ],
        'ssl' => [
            'verify_peer'       => true,
            'verify_peer_name'  => true,
        ],
    ]);

    $html = @file_get_contents($url, false, $ctx);
    if (!$html || strlen($html) < 500) return [];

    // ── Strategy 1: extract from __NEXT_DATA__ JSON ────────────
    if (preg_match('/<script\s+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)<\/script>/s', $html, $m)) {
        $nd = json_decode($m[1], true);
        $content = $nd['props']['pageProps']['chapterInfo']['content'] ?? null;
        if ($content && strlen($content) > 50) {
            $verses = parseContentHtml($content, $abbrev, $chapter);
            if (!empty($verses)) return $verses;
        }
        // Some versions return verses as an array directly
        $verseArr = $nd['props']['pageProps']['chapterInfo']['verses'] ?? null;
        if (is_array($verseArr) && count($verseArr) > 0) {
            return extractFromVerseArray($verseArr);
        }
    }

    // ── Strategy 2: parse data-usfm spans directly from page HTML ─
    return parseContentHtml($html, $abbrev, $chapter);
}

/* Parse HTML content: find spans with data-usfm="BOOK.CH.V" */
function parseContentHtml(string $html, string $abbrev, int $chapter): array {
    libxml_use_internal_errors(true);
    $dom = new DOMDocument('1.0', 'utf-8');
    $dom->loadHTML('<?xml encoding="utf-8"?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();

    $xpath   = new DOMXPath($dom);
    $verses  = [];
    $prefix  = strtoupper($abbrev) . '.' . $chapter . '.';

    // Find all elements whose data-usfm starts with "BOOK.CH."
    $nodes = $xpath->query("//*[starts-with(@data-usfm,'{$prefix}')]");
    foreach ($nodes as $node) {
        $usfm  = $node->getAttribute('data-usfm');
        $parts = explode('.', $usfm);
        if (count($parts) < 3) continue;
        $vNum  = (int)$parts[2];
        if ($vNum < 1 || isset($verses[$vNum])) continue;

        $text = cleanVerseText($node);
        if ($text !== '') $verses[$vNum] = $text;
    }

    if (!empty($verses)) {
        ksort($verses);
        return array_values($verses);
    }

    // ── Fallback: try data-sid="BOOK CH:V" attribute pattern ──
    $nodes2 = $xpath->query("//*[@data-sid]");
    $prefix2 = strtoupper($abbrev) . ' ' . $chapter . ':';
    foreach ($nodes2 as $node) {
        $sid = $node->getAttribute('data-sid');
        if (!str_starts_with($sid, $prefix2)) continue;
        $vNum = (int)substr($sid, strlen($prefix2));
        if ($vNum < 1 || isset($verses[$vNum])) continue;
        $text = cleanVerseText($node);
        if ($text !== '') $verses[$vNum] = $text;
    }

    if (!empty($verses)) {
        ksort($verses);
        return array_values($verses);
    }

    return [];
}

/* Strip verse-number labels and footnotes, return clean verse text */
function cleanVerseText(DOMNode $node): string {
    $clone = $node->cloneNode(true);
    $doc   = $clone->ownerDocument;
    $xp    = new DOMXPath($doc);

    // Remove footnote links/spans (usually <a> or spans with sup/note class)
    foreach ($xp->query('.//a', $clone) as $a) {
        $a->parentNode->removeChild($a);
    }
    foreach ($xp->query('.//sup', $clone) as $sup) {
        $sup->parentNode->removeChild($sup);
    }

    // Remove the verse-number label: first span containing only digits
    $firstSpan = $xp->query('.//span', $clone)->item(0);
    if ($firstSpan && preg_match('/^\s*\d+\s*$/', $firstSpan->textContent)) {
        $firstSpan->parentNode->removeChild($firstSpan);
    }

    $text = preg_replace('/\s+/', ' ', $clone->textContent);
    return trim($text);
}

/* Handle {verse, text} array format (some API responses) */
function extractFromVerseArray(array $arr): array {
    $verses = [];
    foreach ($arr as $v) {
        $num  = (int)($v['verse'] ?? $v['number'] ?? 0);
        $text = trim((string)($v['text'] ?? $v['content'] ?? ''));
        if ($num > 0 && $text !== '') $verses[$num] = $text;
    }
    ksort($verses);
    return array_values($verses);
}
