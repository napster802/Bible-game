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

  function get() {
    if (cached) return cached;
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return null;
    try {
      cached = JSON.parse(raw);
      return cached;
    } catch (e) {
      return null;
    }
  }

  function exists() {
    return !!get();
  }

  function save(name, avatar, avatarType) {
    const profile = {
      deviceId: getDeviceId(),
      name: name.trim().slice(0, 20),
      avatar: avatar || AVATAR_EMOJIS[0],
      avatarType: avatarType || 'emoji'
    };
    safeSet(STORAGE_KEY, JSON.stringify(profile));
    cached = profile;
    syncToServer(profile);
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

  function restoreFromServer() {
    if (get()) return; // local copy already present, nothing to restore
    const deviceId = getDeviceId();
    fetch(`api/profile.php?device_id=${encodeURIComponent(deviceId)}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success || !res.profile || get()) return;
        const profile = {
          deviceId,
          name: res.profile.name,
          avatar: res.profile.avatar,
          avatarType: res.profile.avatarType
        };
        safeSet(STORAGE_KEY, JSON.stringify(profile));
        cached = profile;
      })
      .catch(() => { /* server unreachable — leave profile screen as the fallback */ });
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
      return;
    }
    save(name, pickerSelection.avatar, pickerSelection.avatarType);
    App.showToast('Profile saved!', 'success');
    App.goTo(nextScreen || 'home');
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
    getDeviceId,
    renderAvatarPicker,
    handlePhotoUpload,
    avatarMarkup,
    onEnterProfileScreen,
    saveFromForm
  };
})();
