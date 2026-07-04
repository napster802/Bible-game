<?php
/* ------------------------------------------------------------
   Server-side backup of the player profile (name + avatar),
   keyed by device_id. LocalStorage on the device is still the
   primary source of truth; this lets the app restore the
   profile after the browser's local storage is cleared, as
   long as the device_id itself survived (it is also mirrored
   into a long-lived cookie for that reason - see profile.js).

   This endpoint also holds the authoritative wallet balance and
   owned/equipped cosmetics, since the client must never be
   trusted to self-report its own points.
   ------------------------------------------------------------ */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { jsonOut([]); }

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $deviceId = trim($_GET['device_id'] ?? '');
    if (!$deviceId) jsonOut(['success' => false, 'error' => 'Missing device_id'], 400);

    $stmt = $db->prepare("SELECT * FROM profiles WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $row = $stmt->fetch();
    if (!$row) jsonOut(['success' => false, 'error' => 'No saved profile']);

    jsonOut([
        'success' => true,
        'profile' => [
            'name'             => $row['name'],
            'avatar'           => $row['avatar'],
            'avatarType'       => $row['avatar_type'],
            'wallet'           => (int)$row['wallet'],
            'equippedNameEffect' => $row['equipped_name_effect'],
            'equippedBorder'   => $row['equipped_border'],
            'ownedNameEffects' => json_decode($row['owned_name_effects'] ?: '[]', true) ?: [],
            'ownedBorders'     => json_decode($row['owned_borders'] ?: '[]', true) ?: [],
            'equippedTitle'    => $row['equipped_title'] ?? null,
            'ownedTitles'      => json_decode($row['owned_titles'] ?? '[]', true) ?: [],
            'equippedAnswerSkin' => $row['equipped_answer_skin'] ?? null,
            'ownedAnswerSkins'  => json_decode($row['owned_answer_skins'] ?? '[]', true) ?: [],
            'equippedClueTheme' => $row['equipped_clue_theme'] ?? null,
            'ownedClueThemes'   => json_decode($row['owned_clue_themes'] ?? '[]', true) ?: [],
            'equippedAnimBorder' => $row['equipped_anim_border'] ?? null,
            'ownedAnimBorders'   => json_decode($row['owned_anim_borders'] ?? '[]', true) ?: [],
            'equippedNickColor'  => $row['equipped_nick_color'] ?? null,
            'ownedNickColors'    => json_decode($row['owned_nick_colors'] ?? '[]', true) ?: [],
            'equippedEmojiFrame' => $row['equipped_emoji_frame'] ?? null,
            'ownedEmojiFrames'   => json_decode($row['owned_emoji_frames'] ?? '[]', true) ?: [],
            'boosterCount'       => (int)($row['booster_count'] ?? 0),
        ]
    ]);
}

$input      = getInput();
$deviceId   = trim($input['device_id'] ?? '');
$name       = trim($input['name'] ?? '');
$avatar     = trim($input['avatar'] ?? '');
$avatarType = trim($input['avatar_type'] ?? 'emoji');

if (!$deviceId || !$name || !$avatar) jsonOut(['success' => false, 'error' => 'Missing params'], 400);

$db->prepare("INSERT INTO profiles (device_id, name, avatar, avatar_type, wallet, updated_at) VALUES (?, ?, ?, ?, 0, ?)
              ON CONFLICT(device_id) DO UPDATE SET
                name = excluded.name,
                avatar = excluded.avatar,
                avatar_type = excluded.avatar_type,
                updated_at = excluded.updated_at")
   ->execute([$deviceId, $name, $avatar, $avatarType, nowMs()]);

$walletStmt = $db->prepare("SELECT wallet FROM profiles WHERE device_id = ?");
$walletStmt->execute([$deviceId]);
$newWallet = (int)$walletStmt->fetchColumn();

jsonOut(['success' => true, 'wallet' => $newWallet, 'charged' => 0]);
