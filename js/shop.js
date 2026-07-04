/* ============================================================
   Bible Challenge Arena - Shop Module
   ============================================================ */
const Shop = (function () {

  // ── Catalog definitions ──────────────────────────────────
  const EFFECT_PRICE  = 20000;
  const BORDER_PRICE  = 50000;
  const CATALOG_SIZE  = 20;

  const FLAVOR_NAMES = [
    'Golden Royalty', 'Crimson Blaze', 'Emerald Whisper', 'Sapphire Dream', 'Violet Reign',
    'Sunset Glow', 'Ocean Pulse', 'Amber Flame', 'Rose Quartz', 'Midnight Aurora',
    'Silver Lining', 'Coral Burst', 'Lavender Mist', 'Jade Serenity', 'Ruby Radiance',
    'Cobalt Storm', 'Honey Glaze', 'Magenta Surge', 'Teal Horizon', 'Ivory Halo'
  ];

  const TITLE_CATALOG = [
    { id: 'title-1',  name: 'Scripture Scholar' },
    { id: 'title-2',  name: 'Prophet'           },
    { id: 'title-3',  name: 'Disciple'          },
    { id: 'title-4',  name: 'Apostle'           },
    { id: 'title-5',  name: 'Servant of God'    },
    { id: 'title-6',  name: 'The Chosen'        },
    { id: 'title-7',  name: 'Blessed One'       },
    { id: 'title-8',  name: 'The Faithful'      },
    { id: 'title-9',  name: 'Guardian'          },
    { id: 'title-10', name: 'Beloved'           },
  ];
  const TITLE_PRICE = 15000;

  const SKIN_CATALOG = [
    { id: 'skin-1', name: 'Golden Blaze',   desc: 'Golden particles on correct answer' },
    { id: 'skin-2', name: 'Holy Light',     desc: 'Heavenly white beam of light' },
    { id: 'skin-3', name: 'Fire of Elijah', desc: 'Blazing flame animation' },
    { id: 'skin-4', name: 'Divine Dove',    desc: 'Dove soars across the screen' },
    { id: 'skin-5', name: 'Starfall',       desc: 'Stars shower on correct answer' },
  ];
  const SKIN_PRICE = 30000;

  const CLUE_CATALOG = [
    { id: 'clue-1', name: 'Parchment Scroll', desc: 'Ancient scroll appearance', color: '#c8a96a' },
    { id: 'clue-2', name: 'Stained Glass',    desc: 'Cathedral glass style',     color: '#7b4fa6' },
    { id: 'clue-3', name: 'Temple Stone',     desc: 'Carved stone tablet',       color: '#6b7c6b' },
    { id: 'clue-4', name: 'Night Sky',        desc: 'Dark celestial theme',      color: '#1a2a4a' },
  ];
  const CLUE_PRICE = 25000;

  const ABORDER_CATALOG = [
    { id: 'aborder-1', name: 'Holy Aura',     desc: 'Pulsing golden glow' },
    { id: 'aborder-2', name: 'Radiant Crown', desc: 'Rainbow rotating halo' },
    { id: 'aborder-3', name: 'Divine Fire',   desc: 'Flickering flame ring' },
  ];
  const ABORDER_PRICE = 100000;

  const NCOLOR_CATALOG = [
    { id: 'ncolor-1',  name: 'Gold',       hex: '#FFD700' },
    { id: 'ncolor-2',  name: 'Crimson',    hex: '#DC143C' },
    { id: 'ncolor-3',  name: 'Royal Blue', hex: '#4169E1' },
    { id: 'ncolor-4',  name: 'Emerald',    hex: '#27AE60' },
    { id: 'ncolor-5',  name: 'Purple',     hex: '#9B59B6' },
    { id: 'ncolor-6',  name: 'Orange',     hex: '#E67E22' },
    { id: 'ncolor-7',  name: 'Pink',       hex: '#FF69B4' },
    { id: 'ncolor-8',  name: 'Cyan',       hex: '#1ABC9C' },
    { id: 'ncolor-9',  name: 'Silver',     hex: '#BDC3C7' },
    { id: 'ncolor-10', name: 'Lime',       hex: '#A8D63A' },
  ];
  const NCOLOR_PRICE = 5000;

  const EFRAME_CATALOG = [
    { id: 'eframe-1', name: 'Dove Ring',  emoji: '🕊️' },
    { id: 'eframe-2', name: 'Flame Ring', emoji: '🔥' },
    { id: 'eframe-3', name: 'Star Ring',  emoji: '⭐' },
    { id: 'eframe-4', name: 'Crown Ring', emoji: '👑' },
    { id: 'eframe-5', name: 'Angel Ring', emoji: '😇' },
  ];
  const EFRAME_PRICE = 40000;
  const BOOSTER_PRICE = 5000;

  function buildCatalog(prefix) {
    const items = [];
    for (let i = 1; i <= CATALOG_SIZE; i++) {
      items.push({ id: `${prefix}-${i}`, n: i, name: FLAVOR_NAMES[i - 1], hue: Math.round((i - 1) * 360 / CATALOG_SIZE) });
    }
    return items;
  }

  const EFFECTS = buildCatalog('effect');
  const BORDERS = buildCatalog('border');

  // ── Public lookup helpers (used by multiplayer.js) ───────
  function getTitleLabel(titleId) {
    const item = TITLE_CATALOG.find(t => t.id === titleId);
    return item ? item.name : '';
  }

  function getNickColorHex(colorId) {
    const item = NCOLOR_CATALOG.find(c => c.id === colorId);
    return item ? item.hex : null;
  }

  function getEmojiFrameEmoji(frameId) {
    const item = EFRAME_CATALOG.find(f => f.id === frameId);
    return item ? item.emoji : null;
  }

  // ── Dynamic CSS injection ─────────────────────────────────
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    let css = '';
    EFFECTS.forEach(item => {
      css += `.shop-effect-${item.n} { background: linear-gradient(90deg, hsl(${item.hue},85%,60%), hsl(${(item.hue + 60) % 360},85%,60%)); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800; }\n`;
    });
    BORDERS.forEach(item => {
      css += `.shop-border-${item.n} { box-shadow: 0 0 0 4px hsl(${item.hue},80%,55%), 0 0 16px hsl(${item.hue},80%,55%); border-radius: 50%; }\n`;
    });
    const styleEl = document.createElement('style');
    styleEl.id = 'shop-generated-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function effectClass(itemId) {
    injectStyles();
    const item = EFFECTS.find(e => e.id === itemId);
    return item ? `shop-effect-${item.n}` : '';
  }

  function borderClass(itemId) {
    injectStyles();
    const item = BORDERS.find(b => b.id === itemId);
    return item ? `shop-border-${item.n}` : '';
  }

  // ── API helpers ───────────────────────────────────────────
  function apiCall(action, extra) {
    return fetch('api/shop_action.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ device_id: Profile.getDeviceId(), action }, extra))
    }).then(r => r.json());
  }

  function purchase(itemId) { apiCall('purchase', { item_id: itemId }).then(handleShopResponse); }
  function equip(itemId)    { apiCall('equip',    { item_id: itemId }).then(handleShopResponse); }
  function unequip(type)    { apiCall('unequip',  { type }).then(handleShopResponse); }

  function handleShopResponse(res) {
    if (!res.success) { App.showToast(res.error || 'Shop action failed.', 'error'); return; }
    const profile = Profile.get();
    if (profile) {
      profile.wallet           = res.wallet;
      profile.boosterCount     = res.boosterCount || 0;
      profile.equippedNameEffect = res.equippedNameEffect;
      profile.equippedBorder   = res.equippedBorder;
      profile.ownedNameEffects = res.ownedNameEffects;
      profile.ownedBorders     = res.ownedBorders;
      profile.equippedTitle    = res.equippedTitle;
      profile.ownedTitles      = res.ownedTitles;
      profile.equippedAnswerSkin = res.equippedAnswerSkin;
      profile.ownedAnswerSkins  = res.ownedAnswerSkins;
      profile.equippedClueTheme = res.equippedClueTheme;
      profile.ownedClueThemes   = res.ownedClueThemes;
      profile.equippedAnimBorder = res.equippedAnimBorder;
      profile.ownedAnimBorders   = res.ownedAnimBorders;
      profile.equippedNickColor  = res.equippedNickColor;
      profile.ownedNickColors    = res.ownedNickColors;
      profile.equippedEmojiFrame = res.equippedEmojiFrame;
      profile.ownedEmojiFrames   = res.ownedEmojiFrames;
      Profile.persistCache();
    }
    App.showToast('Done!', 'success');
    renderShop();
  }

  // ── Tab state ─────────────────────────────────────────────
  let activeTab = 'effects';

  function setTab(tab) { activeTab = tab; renderShop(); }

  function onEnterShop() { Profile.refreshFromServer().then(renderShop); renderShop(); }

  // ── Render ────────────────────────────────────────────────
  function renderShop() {
    const profile = Profile.get();
    if (!profile) return;

    const walletEl = document.getElementById('shop-wallet');
    if (walletEl) walletEl.textContent = (profile.wallet || 0).toLocaleString();

    // Highlight active tab
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(t => t.classList.toggle('active', t.id === `shop-tab-${activeTab}`));

    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    injectStyles();

    if (activeTab === 'effects') {
      renderItemGrid(grid, EFFECTS, EFFECT_PRICE, profile.ownedNameEffects || [], profile.equippedNameEffect,
        item => `<span class="shop-card-preview ${effectClass(item.id)}">${escapeHtml(profile.name || 'Name')}</span>`,
        () => unequip('effect')
      );
    } else if (activeTab === 'borders') {
      renderItemGrid(grid, BORDERS, BORDER_PRICE, profile.ownedBorders || [], profile.equippedBorder,
        item => `<span class="shop-card-preview shop-border-preview ${borderClass(item.id)}">${avatarPreview(profile)}</span>`,
        () => unequip('border')
      );
    } else if (activeTab === 'titles') {
      renderItemGrid(grid, TITLE_CATALOG, TITLE_PRICE, profile.ownedTitles || [], profile.equippedTitle,
        item => `<span class="shop-card-preview player-title-badge">${escapeHtml(item.name)}</span>`,
        () => unequip('title')
      );
    } else if (activeTab === 'ncolors') {
      renderItemGrid(grid, NCOLOR_CATALOG, NCOLOR_PRICE, profile.ownedNickColors || [], profile.equippedNickColor,
        item => `<span class="shop-card-preview" style="color:${item.hex};font-weight:800">${escapeHtml(profile.name || 'Name')}</span>`,
        () => unequip('ncolor')
      );
    } else if (activeTab === 'skins') {
      renderItemGrid(grid, SKIN_CATALOG, SKIN_PRICE, profile.ownedAnswerSkins || [], profile.equippedAnswerSkin,
        item => `<span class="shop-card-preview answer-skin-preview answer-skin-${item.id}">✓</span>`,
        () => unequip('skin')
      );
    } else if (activeTab === 'clue') {
      renderItemGrid(grid, CLUE_CATALOG, CLUE_PRICE, profile.ownedClueThemes || [], profile.equippedClueTheme,
        item => `<span class="shop-card-preview clue-theme-preview" style="background:${item.color};color:#fff;border-radius:8px;padding:0.3rem 0.6rem;font-size:0.8rem">Secret Word</span>`,
        () => unequip('clue')
      );
    } else if (activeTab === 'aborder') {
      renderItemGrid(grid, ABORDER_CATALOG, ABORDER_PRICE, profile.ownedAnimBorders || [], profile.equippedAnimBorder,
        item => `<span class="shop-card-preview anim-border-preview ${item.id}">${avatarPreview(profile)}</span>`,
        () => unequip('aborder')
      );
    } else if (activeTab === 'eframe') {
      renderItemGrid(grid, EFRAME_CATALOG, EFRAME_PRICE, profile.ownedEmojiFrames || [], profile.equippedEmojiFrame,
        item => `<span class="shop-card-preview emoji-frame-preview">${item.emoji} ${avatarPreview(profile)} ${item.emoji}</span>`,
        () => unequip('eframe')
      );
    } else if (activeTab === 'consumables') {
      renderConsumables(grid, profile);
    }
  }

  function renderItemGrid(grid, catalog, price, owned, equipped, previewFn, unequipFn) {
    grid.innerHTML = catalog.map(item => {
      const isOwned    = owned.includes(item.id);
      const isEquipped = equipped === item.id;
      const preview    = previewFn(item);
      let btnHtml;
      if (isEquipped) {
        btnHtml = `<button class="btn btn-secondary shop-card-btn" onclick="Shop.unequip('${getCategoryForItem(item.id)}')">Unequip</button>`;
      } else if (isOwned) {
        btnHtml = `<button class="btn btn-primary shop-card-btn" onclick="Shop.equip('${item.id}')">Equip</button>`;
      } else {
        btnHtml = `<button class="btn btn-primary shop-card-btn" onclick="Shop.purchase('${item.id}')">Buy — ${price.toLocaleString()} pts</button>`;
      }
      return `<div class="shop-card ${isEquipped ? 'equipped' : ''}">${preview}<span class="shop-card-name">${escapeHtml(item.name || item.desc || '')}</span>${btnHtml}</div>`;
    }).join('');
  }

  function renderConsumables(grid, profile) {
    const count = profile.boosterCount || 0;
    grid.innerHTML = `
      <div class="shop-card consumable-card">
        <span class="shop-card-preview" style="font-size:2rem">🚀</span>
        <span class="shop-card-name">XP Booster</span>
        <span class="shop-card-desc">1.5× coin earnings for one full game. You have: <strong>${count}</strong></span>
        <button class="btn btn-primary shop-card-btn" onclick="Shop.purchase('booster')">Buy — ${BOOSTER_PRICE.toLocaleString()} pts</button>
      </div>
    `;
  }

  function getCategoryForItem(itemId) {
    if (itemId.startsWith('effect-'))  return 'effect';
    if (itemId.startsWith('border-'))  return 'border';
    if (itemId.startsWith('title-'))   return 'title';
    if (itemId.startsWith('skin-'))    return 'skin';
    if (itemId.startsWith('clue-'))    return 'clue';
    if (itemId.startsWith('aborder-')) return 'aborder';
    if (itemId.startsWith('ncolor-'))  return 'ncolor';
    if (itemId.startsWith('eframe-'))  return 'eframe';
    return 'effect';
  }

  function avatarPreview(profile) {
    if (profile.avatarType === 'photo') {
      return `<img src="${profile.avatar}" style="width:2.2rem;height:2.2rem;border-radius:50%;object-fit:cover;">`;
    }
    return `<span style="font-size:1.6rem;">${profile.avatar}</span>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    EFFECT_PRICE, BORDER_PRICE,
    onEnterShop, setTab, purchase, equip, unequip,
    effectClass, borderClass,
    getTitleLabel, getNickColorHex, getEmojiFrameEmoji,
    TITLE_CATALOG, NCOLOR_CATALOG, EFRAME_CATALOG, SKIN_CATALOG, CLUE_CATALOG, ABORDER_CATALOG,
  };
})();
