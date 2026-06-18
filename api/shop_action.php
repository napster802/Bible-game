<?php
/* ------------------------------------------------------------
   Shop purchase/equip endpoint. Prices are authoritative here on
   the server - the client only renders the catalog, it never
   gets to dictate what something costs or whether it can afford it.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

const EFFECT_PRICE = 20000;
const BORDER_PRICE = 50000;
const CATALOG_SIZE = 20;

$input    = getInput();
$deviceId = trim($input['device_id'] ?? '');
$action   = trim($input['action'] ?? '');
$itemId   = trim($input['item_id'] ?? '');

if (!$deviceId || !$action) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db = getDB();

function parseItem(string $itemId): ?array {
    if (preg_match('/^(effect|border)-(\d+)$/', $itemId, $m)) {
        $n = (int)$m[2];
        if ($n >= 1 && $n <= CATALOG_SIZE) {
            return ['type' => $m[1], 'price' => $m[1] === 'effect' ? EFFECT_PRICE : BORDER_PRICE];
        }
    }
    return null;
}

$stmt = $db->prepare("SELECT * FROM profiles WHERE device_id = ?");
$stmt->execute([$deviceId]);
$profile = $stmt->fetch();
if (!$profile) jsonOut(['success' => false, 'error' => 'No profile found'], 404);

$ownedEffects = json_decode($profile['owned_name_effects'] ?: '[]', true) ?: [];
$ownedBorders = json_decode($profile['owned_borders'] ?: '[]', true) ?: [];

switch ($action) {
    case 'purchase': {
        $item = parseItem($itemId);
        if (!$item) jsonOut(['success' => false, 'error' => 'Unknown item'], 400);
        $ownedList = $item['type'] === 'effect' ? $ownedEffects : $ownedBorders;
        if (in_array($itemId, $ownedList, true)) jsonOut(['success' => false, 'error' => 'Already owned'], 400);

        $wallet = (int)$profile['wallet'];
        if ($wallet < $item['price']) {
            jsonOut(['success' => false, 'error' => "You need " . number_format($item['price']) . " points. You have " . number_format($wallet) . "."], 400);
        }

        $ownedList[] = $itemId;
        $col = $item['type'] === 'effect' ? 'owned_name_effects' : 'owned_borders';
        $db->prepare("UPDATE profiles SET wallet = wallet - ?, $col = ?, updated_at = ? WHERE device_id = ?")
           ->execute([$item['price'], json_encode($ownedList), nowMs(), $deviceId]);
        break;
    }

    case 'equip': {
        if ($itemId === '') {
            jsonOut(['success' => false, 'error' => 'No item specified'], 400);
        }
        $item = parseItem($itemId);
        if (!$item) jsonOut(['success' => false, 'error' => 'Unknown item'], 400);
        $ownedList = $item['type'] === 'effect' ? $ownedEffects : $ownedBorders;
        if (!in_array($itemId, $ownedList, true)) jsonOut(['success' => false, 'error' => 'You do not own this item'], 400);

        $col = $item['type'] === 'effect' ? 'equipped_name_effect' : 'equipped_border';
        $db->prepare("UPDATE profiles SET $col = ?, updated_at = ? WHERE device_id = ?")
           ->execute([$itemId, nowMs(), $deviceId]);
        break;
    }

    case 'unequip': {
        $type = trim($input['type'] ?? '');
        if (!in_array($type, ['effect', 'border'], true)) jsonOut(['success' => false, 'error' => 'Missing type'], 400);
        $col = $type === 'effect' ? 'equipped_name_effect' : 'equipped_border';
        $db->prepare("UPDATE profiles SET $col = NULL, updated_at = ? WHERE device_id = ?")
           ->execute([nowMs(), $deviceId]);
        break;
    }

    default:
        jsonOut(['success' => false, 'error' => 'Unknown action'], 400);
}

$stmt = $db->prepare("SELECT * FROM profiles WHERE device_id = ?");
$stmt->execute([$deviceId]);
$updated = $stmt->fetch();

jsonOut([
    'success' => true,
    'wallet' => (int)$updated['wallet'],
    'equippedNameEffect' => $updated['equipped_name_effect'],
    'equippedBorder' => $updated['equipped_border'],
    'ownedNameEffects' => json_decode($updated['owned_name_effects'] ?: '[]', true) ?: [],
    'ownedBorders' => json_decode($updated['owned_borders'] ?: '[]', true) ?: []
]);
