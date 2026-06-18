/* ============================================================
   Bible Challenge Arena - Player Profile Module
   One profile per device, stored permanently in LocalStorage.
   Fields: deviceId (uuid), name, avatar, avatarType ('emoji'|'photo')
   ============================================================ */
const Profile = (function () {
  const STORAGE_KEY = 'bca_profile';
  const AVATAR_EMOJIS = ['📖', '🕊️', '🌿', '📜', '⭐', '🔥', '⚡', '🌊', '🌺', '🎯', '🏆', '🙏', '🌈', '⚔️', '👑', '🐑'];

  let cached = null;
  let pickerSelection = { avatar: AVATAR_EMOJIS[0], avatarType: 'emoji' };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /* ----------------------------------------------------------
     Browsers/WebViews never expose a device's real MAC address
     to JavaScript (it's blocked everywhere for privacy/security
     reasons). The closest practical equivalent is a persistent
     random ID generated once and kept on the device. To survive
     a "clear site data" wipe of LocalStorage as well as possible,
     that ID is mirrored into both LocalStorage and a long-lived
     cookie, and the resolved name/avatar are also backed up on
     the host server keyed by this ID, so they can be restored
     even if LocalStorage alone gets wiped.
     ---------------------------------------------------------- */
  function getCookie(name) {
    const match = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  function getDeviceId() {
    let id = safeGet('bca_device_id') || getCookie('bca_device_id');
    if (!id) {
      id = uuid();
    }
    safeSet('bca_device_id', id);
    setCookie('bca_device_id', id, 3650);
    return id;
  }

  function withDefaults(profile) {
    if (profile.wallet === undefined) profile.wallet = 0;
    if (profile.equippedNameEffect === undefined) profile.equippedNameEffect = null;
    if (profile.equippedBorder === undefined) profile.equippedBorder = null;
    if (profile.ownedNameEffects === undefined) profile.ownedNameEffects = [];
    if (profile.ownedBorders === undefined) profile.ownedBorders = [];
    return profile;
  }

  function get() {
    if (cached) return cached;
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return null;
    try {
      cached = withDefaults(JSON.parse(raw));
      return cached;
    } catch (e) {
      return null;
    }
  }

  function exists() {
    return !!get();
  }

  // Local-only save, used for first-time setup and avatar-only edits which
  // are always free. Preserves wallet/cosmetics already cached locally
  // (the server remains the source of truth for those - see refreshFromServer).
  function save(name, avatar, avatarType, walletOverride) {
    const existing = get() || {};
    const profile = withDefaults({
      deviceId: getDeviceId(),
      name: name.trim().slice(0, 20),
      avatar: avatar || AVATAR_EMOJIS[0],
      avatarType: avatarType || 'emoji',
      wallet: walletOverride !== undefined ? walletOverride : existing.wallet,
      equippedNameEffect: existing.equippedNameEffect,
      equippedBorder: existing.equippedBorder,
      ownedNameEffects: existing.ownedNameEffects,
      ownedBorders: existing.ownedBorders
    });
    safeSet(STORAGE_KEY, JSON.stringify(profile));
    cached = profile;
    return profile;
  }

  function syncToServer(profile) {
    fetch('api/profile.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: profile.deviceId,
        name: profile.name,
        avatar: profile.avatar,
        avatar_type: profile.avatarType
      })
    }).catch(() => { /* offline / no server yet — local copy still works */ });
  }

  // Renaming a profile is free (same as first-time setup and avatar-only
  // edits) and works even if the server is unreachable - the local copy
  // is the immediate source of truth, with a fire-and-forget server sync.
  function attemptSave(name, avatar, avatarType) {
    const trimmedName = name.trim().slice(0, 20);
    const profile = save(trimmedName, avatar, avatarType);
    syncToServer(profile);
    return Promise.resolve({ profile, charged: 0 });
  }

  function restoreFromServer() {
    if (get()) return; // local copy already present, nothing to restore
    const deviceId = getDeviceId();
    fetch(`api/profile.php?device_id=${encodeURIComponent(deviceId)}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success || !res.profile || get()) return;
        const profile = withDefaults({
          deviceId,
          name: res.profile.name,
          avatar: res.profile.avatar,
          avatarType: res.profile.avatarType,
          wallet: res.profile.wallet,
          equippedNameEffect: res.profile.equippedNameEffect,
          equippedBorder: res.profile.equippedBorder,
          ownedNameEffects: res.profile.ownedNameEffects,
          ownedBorders: res.profile.ownedBorders
        });
        safeSet(STORAGE_KEY, JSON.stringify(profile));
        cached = profile;
      })
      .catch(() => { /* server unreachable — leave profile screen as the fallback */ });
  }

  // Force a fresh pull of wallet/owned/equipped state from the server,
  // used when entering My Profile or the Shop so they never show stale data.
  function refreshFromServer() {
    const existing = get();
    if (!existing) return Promise.resolve(null);
    const deviceId = getDeviceId();
    return fetch(`api/profile.php?device_id=${encodeURIComponent(deviceId)}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success || !res.profile) return existing;
        cached = withDefaults({
          deviceId,
          name: res.profile.name,
          avatar: res.profile.avatar,
          avatarType: res.profile.avatarType,
          wallet: res.profile.wallet,
          equippedNameEffect: res.profile.equippedNameEffect,
          equippedBorder: res.profile.equippedBorder,
          ownedNameEffects: res.profile.ownedNameEffects,
          ownedBorders: res.profile.ownedBorders
        });
        safeSet(STORAGE_KEY, JSON.stringify(cached));
        return cached;
      })
      .catch(() => existing);
  }

  // Persists whatever is currently cached in memory back to LocalStorage,
  // used after the Shop module mutates wallet/owned/equipped fields in place.
  function persistCache() {
    if (!cached) return;
    safeSet(STORAGE_KEY, JSON.stringify(cached));
  }

  function getWallet() {
    const p = get();
    return p ? (p.wallet || 0) : 0;
  }

  // Patches the cached wallet immediately (e.g. right after a multiplayer
  // game credits points) without waiting for a full refreshFromServer round-trip.
  function setWalletCache(amount) {
    const p = get();
    if (!p) return;
    p.wallet = amount;
    cached = p;
    safeSet(STORAGE_KEY, JSON.stringify(p));
  }

  function renderAvatarPicker(containerId, selected) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    AVATAR_EMOJIS.forEach(emoji => {
      const btn = document.createElement('div');
      btn.className = 'avatar-opt' + (emoji === selected ? ' selected' : '');
      btn.textContent = emoji;
      btn.onclick = () => {
        pickerSelection = { avatar: emoji, avatarType: 'emoji' };
        container.querySelectorAll('.avatar-opt').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        const photoPreview = document.getElementById('profile-photo-preview');
        if (photoPreview) photoPreview.style.display = 'none';
      };
      container.appendChild(btn);
    });
  }

  function handlePhotoUpload(fileInput) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      App.showToast('Please choose an image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // Downscale to keep LocalStorage small
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        pickerSelection = { avatar: dataUrl, avatarType: 'photo' };
        const preview = document.getElementById('profile-photo-preview');
        if (preview) {
          preview.src = dataUrl;
          preview.style.display = 'block';
        }
        const grid = document.getElementById('profile-avatar-grid');
        if (grid) grid.querySelectorAll('.avatar-opt').forEach(el => el.classList.remove('selected'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function avatarMarkup(avatar, avatarType, sizeClass) {
    if (avatarType === 'photo') {
      return `<img src="${avatar}" class="${sizeClass || ''}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;vertical-align:middle;">`;
    }
    return avatar;
  }

  function onEnterProfileScreen() {
    const existing = get();
    pickerSelection = existing
      ? { avatar: existing.avatar, avatarType: existing.avatarType }
      : { avatar: AVATAR_EMOJIS[0], avatarType: 'emoji' };

    const nameInput = document.getElementById('profile-name-input');
    if (nameInput) nameInput.value = existing ? existing.name : '';

    renderAvatarPicker('profile-avatar-grid', pickerSelection.avatarType === 'emoji' ? pickerSelection.avatar : null);

    const preview = document.getElementById('profile-photo-preview');
    if (preview) {
      if (pickerSelection.avatarType === 'photo') {
        preview.src = pickerSelection.avatar;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    }

    const title = document.getElementById('profile-screen-title');
    if (title) title.textContent = existing ? 'Edit Your Profile' : 'Create Your Profile';
  }

  function saveFromForm(nextScreen) {
    const nameInput = document.getElementById('profile-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      App.showToast('Please enter your name', 'error');
      return Promise.reject(new Error('Please enter your name'));
    }
    return attemptSave(name, pickerSelection.avatar, pickerSelection.avatarType)
      .then(result => {
        App.showToast(result.charged > 0 ? `Profile saved! (-${result.charged.toLocaleString()} pts)` : 'Profile saved!', 'success');
        if (nextScreen !== 'skip') App.goTo(nextScreen || 'home');
        return result;
      })
      .catch(err => {
        App.showToast(err.message || 'Could not save profile.', 'error');
        throw err;
      });
  }

  function onEnterMyProfileScreen() {
    refreshFromServer().then(renderMyProfile);
    renderMyProfile(get());
  }

  function renderMyProfile(profile) {
    if (!profile) { App.goTo('profile'); return; }

    const avatarWrap = document.getElementById('my-profile-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = avatarMarkup(profile.avatar, profile.avatarType, '');
      avatarWrap.className = 'my-profile-avatar-wrap' +
        (profile.equippedBorder && window.Shop ? ' ' + Shop.borderClass(profile.equippedBorder) : '');
    }

    const nameEl = document.getElementById('my-profile-name');
    if (nameEl) {
      nameEl.textContent = profile.name;
      nameEl.className = 'my-profile-name' +
        (profile.equippedNameEffect && window.Shop ? ' ' + Shop.effectClass(profile.equippedNameEffect) : '');
    }

    const walletEl = document.getElementById('my-profile-wallet');
    if (walletEl) walletEl.textContent = (profile.wallet || 0).toLocaleString();
  }

  function init() {
    // Called once on app boot. If no profile, home screen buttons will
    // redirect through the profile screen first (handled in app.js).
    getDeviceId();
    restoreFromServer();
  }

  return {
    AVATAR_EMOJIS,
    init,
    get,
    exists,
    save,
    attemptSave,
    getDeviceId,
    renderAvatarPicker,
    handlePhotoUpload,
    avatarMarkup,
    onEnterProfileScreen,
    onEnterMyProfileScreen,
    saveFromForm,
    refreshFromServer,
    getWallet,
    setWalletCache,
    persistCache
  };
})();
