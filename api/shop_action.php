<?php
/* ------------------------------------------------------------
   Shop purchase/equip endpoint. Prices and ownership are
   authoritative here on the server - the client only renders
   the catalog, it never gets to dictate costs or ownership.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

// [item_count, price_pts, owned_column, equipped_column]
const ITEM_TYPES = [
    'effect'  => [20, 5000,   'owned_name_effects',  'equipped_name_effect'],
    'border'  => [20, 12500,  'owned_borders',        'equipped_border'],
    'title'   => [10, 3750,   'owned_titles',         'equipped_title'],
    'skin'    => [5,  7500,   'owned_answer_skins',   'equipped_answer_skin'],
    'clue'    => [4,  6250,   'owned_clue_themes',    'equipped_clue_theme'],
    'aborder' => [3,  25000,  'owned_anim_borders',   'equipped_anim_border'],
    'ncolor'  => [10, 1250,   'owned_nick_colors',    'equipped_nick_color'],
    'eframe'  => [5,  10000,  'owned_emoji_frames',   'equipped_emoji_frame'],
];
const BOOSTER_PRICE = 1250;

$input    = getInput();
$deviceId = trim($input['device_id'] ?? '');
$action   = trim($input['action'] ?? '');
$itemId   = trim($input['item_id'] ?? '');

if (!$deviceId || !$action) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

function parseItem(string $itemId): ?array {
    if ($itemId === 'booster') return ['type' => 'booster', 'price' => BOOSTER_PRICE];
    foreach (ITEM_TYPES as $type => $cfg) {
        [$count, $price] = $cfg;
        if (preg_match('/^' . preg_quote($type, '/') . '-(\d+)$/', $itemId, $m)) {
            $n = (int)$m[1];
            if ($n >= 1 && $n <= $count) return ['type' => $type, 'price' => $price];
        }
    }
    return null;
}

$stmt = $db->prepare("SELECT * FROM profiles WHERE device_id = ?");
$stmt->execute([$deviceId]);
$profile = $stmt->fetch();
if (!$profile) jsonOut(['success' => false, 'error' => 'No profile found'], 404);

switch ($action) {
    case 'purchase': {
        $item = parseItem($itemId);
        if (!$item) jsonOut(['success' => false, 'error' => 'Unknown item'], 400);

        $wallet = (int)$profile['wallet'];
        if ($wallet < $item['price']) {
            jsonOut(['success' => false, 'error' => 'You need ' . number_format($item['price']) . ' points. You have ' . number_format($wallet) . '.'], 400);
        }

        if ($item['type'] === 'booster') {
            $db->prepare("UPDATE profiles SET wallet = wallet - ?, booster_count = booster_count + 1, updated_at = ? WHERE device_id = ?")
               ->execute([BOOSTER_PRICE, nowMs(), $deviceId]);
        } else {
            [$count, $price, $ownedCol] = ITEM_TYPES[$item['type']];
            $ownedList = json_decode($profile[$ownedCol] ?: '[]', true) ?: [];
            if (in_array($itemId, $ownedList, true)) jsonOut(['success' => false, 'error' => 'Already owned'], 400);
            $ownedList[] = $itemId;
            $db->prepare("UPDATE profiles SET wallet = wallet - ?, $ownedCol = ?, updated_at = ? WHERE device_id = ?")
               ->execute([$item['price'], json_encode($ownedList), nowMs(), $deviceId]);
        }
        break;
    }

    case 'equip': {
        $item = parseItem($itemId);
        if (!$item || $item['type'] === 'booster') jsonOut(['success' => false, 'error' => 'Unknown item'], 400);
        [$count, $price, $ownedCol, $equippedCol] = ITEM_TYPES[$item['type']];
        $ownedList = json_decode($profile[$ownedCol] ?: '[]', true) ?: [];
        if (!in_array($itemId, $ownedList, true)) jsonOut(['success' => false, 'error' => 'You do not own this item'], 400);
        $db->prepare("UPDATE profiles SET $equippedCol = ?, updated_at = ? WHERE device_id = ?")
           ->execute([$itemId, nowMs(), $deviceId]);
        break;
    }

    case 'unequip': {
        $type = trim($input['type'] ?? '');
        if (!isset(ITEM_TYPES[$type])) jsonOut(['success' => false, 'error' => 'Invalid type'], 400);
        [$count, $price, $ownedCol, $equippedCol] = ITEM_TYPES[$type];
        $db->prepare("UPDATE profiles SET $equippedCol = NULL, updated_at = ? WHERE device_id = ?")
           ->execute([nowMs(), $deviceId]);
        break;
    }

    default:
        jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
}

$stmt = $db->prepare("SELECT * FROM profiles WHERE device_id = ?");
$stmt->execute([$deviceId]);
$updated = $stmt->fetch();

$res = [
    'success'      => true,
    'wallet'       => (int)$updated['wallet'],
    'boosterCount' => (int)$updated['booster_count'],
    // Legacy keys
    'equippedNameEffect' => $updated['equipped_name_effect'],
    'equippedBorder'     => $updated['equipped_border'],
    'ownedNameEffects'   => json_decode($updated['owned_name_effects'] ?: '[]', true) ?: [],
    'ownedBorders'       => json_decode($updated['owned_borders'] ?: '[]', true) ?: [],
    // New keys
    'equippedTitle'      => $updated['equipped_title'],
    'ownedTitles'        => json_decode($updated['owned_titles'] ?: '[]', true) ?: [],
    'equippedAnswerSkin' => $updated['equipped_answer_skin'],
    'ownedAnswerSkins'   => json_decode($updated['owned_answer_skins'] ?: '[]', true) ?: [],
    'equippedClueTheme'  => $updated['equipped_clue_theme'],
    'ownedClueThemes'    => json_decode($updated['owned_clue_themes'] ?: '[]', true) ?: [],
    'equippedAnimBorder' => $updated['equipped_anim_border'],
    'ownedAnimBorders'   => json_decode($updated['owned_anim_borders'] ?: '[]', true) ?: [],
    'equippedNickColor'  => $updated['equipped_nick_color'],
    'ownedNickColors'    => json_decode($updated['owned_nick_colors'] ?: '[]', true) ?: [],
    'equippedEmojiFrame' => $updated['equipped_emoji_frame'],
    'ownedEmojiFrames'   => json_decode($updated['owned_emoji_frames'] ?: '[]', true) ?: [],
];

jsonOut($res);
