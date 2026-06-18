/* ============================================================
   Bible Challenge Arena - Shop Module
   Procedurally generated cosmetics: 20 Name Effects (20,000 pts
   each) and 20 Profile Borders (50,000 pts each). Prices and
   ownership are validated server-side in api/shop_action.php -
   this module only renders the catalog and reflects whatever the
   server confirms was purchased/equipped.
   ============================================================ */
const Shop = (function () {
  const EFFECT_PRICE = 20000;
  const BORDER_PRICE = 50000;
  const CATALOG_SIZE = 20;

  const FLAVOR_NAMES = [
    'Golden Royalty', 'Crimson Blaze', 'Emerald Whisper', 'Sapphire Dream', 'Violet Reign',
    'Sunset Glow', 'Ocean Pulse', 'Amber Flame', 'Rose Quartz', 'Midnight Aurora',
    'Silver Lining', 'Coral Burst', 'Lavender Mist', 'Jade Serenity', 'Ruby Radiance',
    'Cobalt Storm', 'Honey Glaze', 'Magenta Surge', 'Teal Horizon', 'Ivory Halo'
  ];

  function buildCatalog(prefix) {
    const items = [];
    for (let i = 1; i <= CATALOG_SIZE; i++) {
      items.push({ id: `${prefix}-${i}`, n: i, name: FLAVOR_NAMES[i - 1], hue: Math.round((i - 1) * 360 / CATALOG_SIZE) });
    }
    return items;
  }

  const EFFECTS = buildCatalog('effect');
  const BORDERS = buildCatalog('border');

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

  function api(action, extra) {
    return fetch('api/shop_action.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        device_id: Profile.getDeviceId(),
        action: action
      }, extra))
    }).then(r => r.json());
  }

  function purchase(itemId) {
    api('purchase', { item_id: itemId }).then(handleShopResponse);
  }

  function equip(itemId) {
    api('equip', { item_id: itemId }).then(handleShopResponse);
  }

  function unequip(type) {
    api('unequip', { type: type }).then(handleShopResponse);
  }

  function handleShopResponse(res) {
    if (!res.success) {
      App.showToast(res.error || 'Shop action failed.', 'error');
      return;
    }
    const profile = Profile.get();
    if (profile) {
      profile.wallet = res.wallet;
      profile.equippedNameEffect = res.equippedNameEffect;
      profile.equippedBorder = res.equippedBorder;
      profile.ownedNameEffects = res.ownedNameEffects;
      profile.ownedBorders = res.ownedBorders;
      Profile.persistCache();
    }
    App.showToast('Done!', 'success');
    renderShop();
  }

  let activeTab = 'effects';

  function setTab(tab) {
    activeTab = tab;
    renderShop();
  }

  function onEnterShop() {
    Profile.refreshFromServer().then(renderShop);
    renderShop();
  }

  function renderShop() {
    const profile = Profile.get();
    if (!profile) return;

    const walletEl = document.getElementById('shop-wallet');
    if (walletEl) walletEl.textContent = (profile.wallet || 0).toLocaleString();

    const tabEffects = document.getElementById('shop-tab-effects');
    const tabBorders = document.getElementById('shop-tab-borders');
    if (tabEffects) tabEffects.classList.toggle('active', activeTab === 'effects');
    if (tabBorders) tabBorders.classList.toggle('active', activeTab === 'borders');

    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    injectStyles();

    const catalog = activeTab === 'effects' ? EFFECTS : BORDERS;
    const price = activeTab === 'effects' ? EFFECT_PRICE : BORDER_PRICE;
    const owned = activeTab === 'effects' ? (profile.ownedNameEffects || []) : (profile.ownedBorders || []);
    const equipped = activeTab === 'effects' ? profile.equippedNameEffect : profile.equippedBorder;

    grid.innerHTML = catalog.map(item => {
      const isOwned = owned.includes(item.id);
      const isEquipped = equipped === item.id;
      const previewClass = activeTab === 'effects' ? effectClass(item.id) : '';
      const previewHtml = activeTab === 'effects'
        ? `<span class="shop-card-preview ${previewClass}">${escapeHtml(profile.name || 'Name')}</span>`
        : `<span class="shop-card-preview shop-border-preview ${borderClass(item.id)}">${avatarPreview(profile)}</span>`;

      let btnHtml;
      if (isEquipped) {
        btnHtml = `<button class="btn btn-secondary shop-card-btn" onclick="Shop.unequip('${activeTab === 'effects' ? 'effect' : 'border'}')">Unequip</button>`;
      } else if (isOwned) {
        btnHtml = `<button class="btn btn-primary shop-card-btn" onclick="Shop.equip('${item.id}')">Equip</button>`;
      } else {
        btnHtml = `<button class="btn btn-primary shop-card-btn" onclick="Shop.purchase('${item.id}')">Buy — ${price.toLocaleString()} pts</button>`;
      }

      return `
        <div class="shop-card ${isEquipped ? 'equipped' : ''}">
          ${previewHtml}
          <span class="shop-card-name">${escapeHtml(item.name)}</span>
          ${btnHtml}
        </div>
      `;
    }).join('');
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
    EFFECT_PRICE,
    BORDER_PRICE,
    onEnterShop,
    setTab,
    purchase,
    equip,
    unequip,
    effectClass,
    borderClass
  };
})();
