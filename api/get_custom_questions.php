<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$db = getDB();
$stmt = $db->query("SELECT * FROM custom_questions ORDER BY id ASC");
$rows = $stmt->fetchAll();

$questions = array_map(function ($r) {
    return [
        'id'         => (int)$r['id'],
        'book'       => $r['book'],
        'category'   => $r['category'],
        'difficulty' => $r['difficulty'],
        'question'   => $r['question'],
        'choices'    => [$r['choice1'], $r['choice2'], $r['choice3'], $r['choice4']],
        'answer'     => $r['answer'],
        'reference'  => $r['reference']
    ];
}, $rows);

jsonOut(['success' => true, 'questions' => $questions]);
