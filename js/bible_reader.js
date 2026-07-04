/* ============================================================
   KJV Bible Reader
   Screens: screen-bible (books) → screen-bible-chapters → screen-bible-reader
   ============================================================ */
const BibleReader = (function () {

  // ── Version state ─────────────────────────────────────────
  let curVersion = 'kjv';   // 'kjv' | 'abhil82'
  let booksCache = {};      // {kjv: [...], abhil82: [...]}

  // Storage key is version-aware; KJV keeps legacy key for backward compat
  function storageKey() {
    return curVersion === 'kjv' ? 'bca_bible' : `bca_bible_${curVersion}`;
  }

  let allBooks = null;        // current version's [{book_num, book_name, testament, chapters}]
  let curBook  = null;        // current book object
  let curChapter = 1;
  let totalChapters = 1;
  let isBookmarked = false;
  let pendingHl    = null;    // pending highlight: {book, chapter, verse, start, end}
  let searchTimer  = null;

  // ── Persistence ───────────────────────────────────────────
  function loadStorage() {
    try { return JSON.parse(localStorage.getItem(storageKey()) || '{}'); }
    catch (e) { return {}; }
  }
  function saveStorage(obj) { localStorage.setItem(storageKey(), JSON.stringify(obj)); }

  function getBookmarks() { return loadStorage().bookmarks || []; }
  function getLastRead()  { return loadStorage().lastRead  || null; }

  function saveLastRead(bookNum, bookName, chapter) {
    const s = loadStorage();
    s.lastRead = { bookNum, bookName, chapter };
    saveStorage(s);
  }

  function addBookmark(bookNum, bookName, chapter) {
    const s = loadStorage();
    const bms = s.bookmarks || [];
    const key = `${bookNum}:${chapter}`;
    if (!bms.find(b => `${b.bookNum}:${b.chapter}` === key)) {
      bms.unshift({ bookNum, bookName, chapter, addedAt: Date.now() });
      if (bms.length > 50) bms.length = 50;
    }
    s.bookmarks = bms;
    saveStorage(s);
  }

  function removeBookmark(bookNum, chapter) {
    const s = loadStorage();
    s.bookmarks = (s.bookmarks || []).filter(b => !(b.bookNum === bookNum && b.chapter === chapter));
    saveStorage(s);
  }

  function isBookmarkSaved(bookNum, chapter) {
    return getBookmarks().some(b => b.bookNum === bookNum && b.chapter === chapter);
  }

  function getVerseHighlights(book, chapter, verse) {
    const s = loadStorage();
    return ((s.highlights || {})[ `${book}:${chapter}:${verse}` ]) || [];
  }
  function saveVerseHighlight(book, chapter, verse, start, end, color) {
    const s = loadStorage();
    if (!s.highlights) s.highlights = {};
    const key  = `${book}:${chapter}:${verse}`;
    const list = (s.highlights[key] || []).filter(h => !(h.start < end && h.end > start));
    list.push({ start, end, color });
    s.highlights[key] = list;
    saveStorage(s);
  }
  function removeVerseHighlightsAt(book, chapter, verse, start, end) {
    const s = loadStorage();
    if (!s.highlights) return;
    const key = `${book}:${chapter}:${verse}`;
    s.highlights[key] = (s.highlights[key] || []).filter(h => !(h.start < end && h.end > start));
    saveStorage(s);
  }

  // ── Navigation helpers ────────────────────────────────────
  function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  // ── Version switching ─────────────────────────────────────
  function setVersion(v) {
    if (!['kjv', 'abhil82'].includes(v) || v === curVersion) return;
    curVersion = v;
    allBooks   = booksCache[curVersion] || null;
    curBook    = null;
    curChapter = 1;
    totalChapters = 1;
    updateVersionUI();
    goTo('screen-bible');
    renderBookList();
  }

  function updateVersionUI() {
    const sel = document.getElementById('bible-version-select');
    if (sel) sel.value = curVersion;
    const vname = curVersion === 'abhil82' ? '📖 ABHIL82 Hiligaynon' : '📖 KJV Bible';
    const titleEl = document.getElementById('bible-version-title');
    if (titleEl) titleEl.textContent = vname;
    const searchTitle = document.getElementById('bible-search-title');
    if (searchTitle) searchTitle.textContent = `🔍 Search ${curVersion === 'abhil82' ? 'ABHIL82' : 'KJV'}`;
    // Show download button only for ABHIL82
    const dlBtn = document.getElementById('abhil82-dl-btn');
    if (dlBtn) dlBtn.style.display = curVersion === 'abhil82' ? '' : 'none';
  }

  // ── Open — Book List ──────────────────────────────────────
  function open() {
    goTo('screen-bible');
    updateVersionUI();
    renderBookList();
  }

  async function renderBookList() {
    const listEl = document.getElementById('bible-book-list');
    const lastReadEl = document.getElementById('bible-last-read');

    // Continue reading card
    const lr = getLastRead();
    if (lr && lastReadEl) {
      lastReadEl.style.display = 'block';
      document.getElementById('bible-continue-label').textContent =
        `${lr.bookName} — Chapter ${lr.chapter}`;
    } else if (lastReadEl) {
      lastReadEl.style.display = 'none';
    }

    if (booksCache[curVersion]) {
      allBooks = booksCache[curVersion];
      renderBooks(listEl);
      return;
    }

    listEl.innerHTML = '<div class="bible-loading">📖 Loading Bible…</div>';
    try {
      const res = await fetch(`api/bible.php?action=books&version=${curVersion}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      booksCache[curVersion] = data.books;
      allBooks = data.books;
      renderBooks(listEl);
    } catch (e) {
      listEl.innerHTML = `<div class="bible-loading" style="color:#e74c3c;">Failed to load Bible. ${e.message}</div>`;
    }
  }

  function renderBooks(listEl) {
    const bms = getBookmarks();
    let html = '';

    // Bookmarks section
    if (bms.length > 0) {
      html += '<div class="bible-section-header">🔖 Bookmarks</div>';
      html += bms.slice(0, 5).map(bm => `
        <div class="bible-book-item bookmark-item" onclick="BibleReader.selectChapter(${bm.bookNum},'${escHtml(bm.bookName)}',${totalChapForBook(bm.bookNum)},${bm.chapter})">
          <div class="bible-book-info">
            <div class="bible-book-name">${escHtml(bm.bookName)} ${bm.chapter}</div>
            <div class="bible-book-sub">Chapter ${bm.chapter}</div>
          </div>
          <span class="bible-book-arrow">›</span>
        </div>`).join('');
    }

    // OT
    html += '<div class="bible-section-header">📜 Old Testament</div>';
    allBooks.filter(b => b.testament === 'OT').forEach(b => {
      html += bookItemHtml(b);
    });

    // NT
    html += '<div class="bible-section-header">✝️ New Testament</div>';
    allBooks.filter(b => b.testament === 'NT').forEach(b => {
      html += bookItemHtml(b);
    });

    listEl.innerHTML = html;
  }

  function totalChapForBook(bookNum) {
    if (!allBooks) return 1;
    const b = allBooks.find(x => x.book_num === bookNum);
    return b ? b.chapters : 1;
  }

  function bookItemHtml(b) {
    return `
      <div class="bible-book-item" onclick="BibleReader.openBook(${b.book_num},'${escHtml(b.book_name)}',${b.chapters})">
        <div class="bible-book-info">
          <div class="bible-book-name">${escHtml(b.book_name)}</div>
          <div class="bible-book-sub">${b.chapters} chapter${b.chapters !== 1 ? 's' : ''}</div>
        </div>
        <span class="bible-book-arrow">›</span>
      </div>`;
  }

  // ── Open Book → Chapter Grid ──────────────────────────────
  function openBook(bookNum, bookName, chapters) {
    curBook = { book_num: bookNum, book_name: bookName, chapters };
    totalChapters = chapters;

    document.getElementById('bible-chapters-title').textContent = bookName;

    const grid = document.getElementById('bible-chapter-grid');
    grid.innerHTML = '';
    for (let c = 1; c <= chapters; c++) {
      const btn = document.createElement('button');
      btn.className = 'bible-chapter-btn';
      btn.textContent = c;
      btn.onclick = () => openReader(bookNum, bookName, c, chapters);
      grid.appendChild(btn);
    }
    goTo('screen-bible-chapters');
  }

  // Called from bookmarks shortcut
  function selectChapter(bookNum, bookName, chapters, chapter) {
    curBook = { book_num: bookNum, book_name: bookName, chapters };
    totalChapters = chapters;
    openReader(bookNum, bookName, chapter, chapters);
  }

  // ── Continue Reading ──────────────────────────────────────
  function continueReading() {
    const lr = getLastRead();
    if (!lr || !allBooks) return;
    const book = allBooks.find(b => b.book_num === lr.bookNum);
    if (!book) return;
    curBook = book;
    totalChapters = book.chapters;
    openReader(lr.bookNum, lr.bookName, lr.chapter, book.chapters);
  }

  // ── Reader ────────────────────────────────────────────────
  async function openReader(bookNum, bookName, chapter, chapTotal) {
    curChapter = chapter;
    totalChapters = chapTotal || totalChapters;
    curBook = curBook || { book_num: bookNum, book_name: bookName, chapters: chapTotal };

    goTo('screen-bible-reader');

    // Show loading
    const body = document.getElementById('bible-reader-body');
    body.innerHTML = '<div class="bible-loading">Loading…</div>';
    body.scrollTop = 0;

    updateReaderNav(bookNum, bookName, chapter, chapTotal);
    isBookmarked = isBookmarkSaved(bookNum, chapter);
    updateBookmarkBtn();

    saveLastRead(bookNum, bookName, chapter);

    try {
      const res = await fetch(`api/bible.php?action=text&book=${bookNum}&ch=${chapter}&version=${curVersion}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      totalChapters = data.total_chapters;
      updateReaderNav(bookNum, bookName, chapter, data.total_chapters);

      body.innerHTML = data.verses.map(v => verseHtml(v.verse, v.text, bookNum, chapter)).join('');
      body.scrollTop = 0;

      // setupSwipe clones the body element (to clear old touch listeners), so run it first
      setupSwipe(body, bookNum, bookName, data.total_chapters);
      // Re-query the fresh body after cloning, then attach dblclick handlers
      const freshBody = document.getElementById('bible-reader-body');
      setupDoubleClickHighlight(freshBody, bookNum, chapter);
    } catch (e) {
      body.innerHTML = `<div class="bible-loading" style="color:#e74c3c;">Failed to load. ${e.message}</div>`;
    }
  }

  function updateReaderNav(bookNum, bookName, chapter, total) {
    const title = `${bookName} — Ch. ${chapter}`;
    document.getElementById('bible-reader-title').textContent = title;

    ['top', 'bot'].forEach(pos => {
      const label = document.getElementById(`bible-ch-label-${pos}`);
      const prev  = document.getElementById(`bible-prev-${pos}`);
      const next  = document.getElementById(`bible-next-${pos}`);
      if (label) label.textContent = `Chapter ${chapter} of ${total}`;
      if (prev)  prev.disabled  = (chapter <= 1);
      if (next)  next.disabled  = (chapter >= total);
    });
  }

  function nextChapter() {
    if (!curBook || curChapter >= totalChapters) return;
    openReader(curBook.book_num, curBook.book_name, curChapter + 1, totalChapters);
  }

  function prevChapter() {
    if (!curBook || curChapter <= 1) return;
    openReader(curBook.book_num, curBook.book_name, curChapter - 1, totalChapters);
  }

  // ── Swipe navigation ──────────────────────────────────────
  function setupSwipe(el, bookNum, bookName, chapTotal) {
    let touchStartY = 0;
    let scrollAtStart = 0;

    // Remove old listeners by cloning
    const fresh = el.cloneNode(true);
    el.parentNode.replaceChild(fresh, el);
    document.getElementById('bible-reader-body'); // re-query after clone

    fresh.addEventListener('touchstart', e => {
      touchStartY    = e.touches[0].clientY;
      scrollAtStart  = fresh.scrollTop;
    }, { passive: true });

    fresh.addEventListener('touchend', e => {
      const dy     = touchStartY - e.changedTouches[0].clientY; // + = swiped up
      const atBot  = fresh.scrollTop + fresh.clientHeight >= fresh.scrollHeight - 20;
      const atTop  = fresh.scrollTop <= 5;
      if (Math.abs(dy) < 40) return;
      if (dy > 0 && atBot && curChapter < chapTotal) nextChapter();
      if (dy < 0 && atTop && curChapter > 1)         prevChapter();
    }, { passive: true });
  }

  // ── Bookmark ──────────────────────────────────────────────
  function toggleBookmark() {
    if (!curBook) return;
    if (isBookmarked) {
      removeBookmark(curBook.book_num, curChapter);
      isBookmarked = false;
      App.showToast('Bookmark removed', 'info');
    } else {
      addBookmark(curBook.book_num, curBook.book_name, curChapter);
      isBookmarked = true;
      App.showToast(`${curBook.book_name} Ch.${curChapter} bookmarked!`, 'success');
    }
    updateBookmarkBtn();
  }

  function updateBookmarkBtn() {
    const btn = document.getElementById('bible-bookmark-btn');
    if (!btn) return;
    btn.textContent = isBookmarked ? '🔖' : '🏷️';
    btn.title       = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
    btn.classList.toggle('active', isBookmarked);
  }

  // ── Back buttons ──────────────────────────────────────────
  function backToBooks()    { goTo('screen-bible'); renderBookList(); }
  function backToChapters() {
    if (curBook) {
      goTo('screen-bible-chapters');
    } else {
      goTo('screen-bible');
    }
  }
  function backFromBible()  { goTo('screen-home'); }

  // ── Verse render helpers ──────────────────────────────────
  function verseHtml(verseNum, rawText, book, chapter) {
    const hls = getVerseHighlights(book, chapter, verseNum);
    const body = applyHighlightsToText(rawText, hls);
    return `<p class="bible-verse" data-verse="${verseNum}" data-raw="${escAttr(rawText)}"><span class="bible-verse-num">${verseNum}</span>${body}</p>`;
  }

  function applyHighlightsToText(text, highlights) {
    if (!highlights || !highlights.length) return escHtml(text);
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    let result = '', pos = 0;
    for (const hl of sorted) {
      if (hl.start > pos) result += escHtml(text.slice(pos, hl.start));
      result += `<mark class="hl-${hl.color}">${escHtml(text.slice(hl.start, hl.end))}</mark>`;
      pos = hl.end;
    }
    if (pos < text.length) result += escHtml(text.slice(pos));
    return result;
  }

  function reRenderVerse(book, chapter, verseNum) {
    const el = document.querySelector(`.bible-verse[data-verse="${verseNum}"]`);
    if (!el) return;
    const raw = el.dataset.raw;
    if (!raw) return;
    const hls = getVerseHighlights(book, chapter, verseNum);
    el.innerHTML = `<span class="bible-verse-num">${verseNum}</span>${applyHighlightsToText(raw, hls)}`;
  }

  // ── Double-click → highlight bar ─────────────────────────
  function setupDoubleClickHighlight(body, book, chapter) {
    // Single tap outside any verse dismisses the bar
    body.addEventListener('click', e => {
      const verseEl = findVerseEl(e.target);
      if (!verseEl) dismissHighlightBar();
    }, { capture: false });

    body.querySelectorAll('.bible-verse').forEach(verseEl => {
      verseEl.addEventListener('dblclick', e => {
        e.stopPropagation();
        const verseNum = parseInt(verseEl.dataset.verse);
        const rawText  = verseEl.dataset.raw || '';

        // Remove tapped state from any previously selected verse
        body.querySelectorAll('.bible-verse.verse-tapped').forEach(v => v.classList.remove('verse-tapped'));

        // Mark this verse as selected for highlighting
        verseEl.classList.add('verse-tapped');

        // Highlight the whole verse text (start=0, end=length)
        pendingHl = { book, chapter, verse: verseNum, start: 0, end: rawText.length };

        // Position bar centered below/above the verse element
        showHighlightBarAtEl(verseEl);
      });
    });
  }

  function dismissHighlightBar() {
    document.querySelectorAll('.bible-verse.verse-tapped').forEach(v => v.classList.remove('verse-tapped'));
    hideHighlightBar();
    pendingHl = null;
  }

  function findVerseEl(node) {
    let el = node instanceof Element ? node : node?.parentElement;
    while (el && !el.classList?.contains('bible-verse')) el = el.parentElement;
    return el || null;
  }

  function showHighlightBarAtEl(verseEl) {
    const bar = document.getElementById('bible-hl-bar');
    if (!bar) return;
    bar.style.display = 'flex';

    const rect = verseEl.getBoundingClientRect();
    const bw   = bar.offsetWidth || 240;
    let left   = rect.left + rect.width / 2;
    let top    = rect.bottom + 8;                         // below the verse by default
    if (top + 50 > window.innerHeight) top = rect.top - 58; // flip above if near bottom
    if (left + bw / 2 > window.innerWidth - 8) left = window.innerWidth - bw / 2 - 8;
    if (left - bw / 2 < 8)                     left = bw / 2 + 8;

    bar.style.left = left + 'px';
    bar.style.top  = top  + 'px';
  }

  function hideHighlightBar() {
    const bar = document.getElementById('bible-hl-bar');
    if (bar) bar.style.display = 'none';
  }

  function applyHighlight(color) {
    if (!pendingHl) return;
    const { book, chapter, verse, start, end } = pendingHl;
    saveVerseHighlight(book, chapter, verse, start, end, color);
    reRenderVerse(book, chapter, verse);
    attachVerseDblClick(verse, book, chapter);
    pendingHl = null;
    hideHighlightBar();
  }

  function clearHighlight() {
    if (!pendingHl) return;
    const { book, chapter, verse, start, end } = pendingHl;
    removeVerseHighlightsAt(book, chapter, verse, start, end);
    reRenderVerse(book, chapter, verse);
    attachVerseDblClick(verse, book, chapter);
    pendingHl = null;
    hideHighlightBar();
  }

  function attachVerseDblClick(verseNum, book, chapter) {
    const verseEl = document.querySelector(`.bible-verse[data-verse="${verseNum}"]`);
    if (!verseEl) return;
    verseEl.classList.remove('verse-tapped');
    verseEl.addEventListener('dblclick', e => {
      e.stopPropagation();
      const raw = verseEl.dataset.raw || '';
      document.querySelectorAll('.bible-verse.verse-tapped').forEach(v => v.classList.remove('verse-tapped'));
      verseEl.classList.add('verse-tapped');
      pendingHl = { book, chapter, verse: verseNum, start: 0, end: raw.length };
      showHighlightBarAtEl(verseEl);
    });
  }

  // ── Search ────────────────────────────────────────────────
  function openSearch() {
    goTo('screen-bible-search');
    const inp = document.getElementById('bible-search-input');
    if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 150); }
    const status  = document.getElementById('bible-search-status');
    const results = document.getElementById('bible-search-results');
    if (status)  status.textContent = '';
    if (results) results.innerHTML  = '';
  }

  function closeSearch() {
    if (curBook) goTo('screen-bible-reader');
    else { goTo('screen-bible'); renderBookList(); }
  }

  function onSearchInput(val) {
    clearTimeout(searchTimer);
    const q = val.trim();
    if (q.length < 2) {
      const s = document.getElementById('bible-search-status');
      const r = document.getElementById('bible-search-results');
      if (s) s.textContent = ''; if (r) r.innerHTML = ''; return;
    }
    searchTimer = setTimeout(() => doSearch(q), 400);
  }

  async function doSearch(q) {
    const status  = document.getElementById('bible-search-status');
    const results = document.getElementById('bible-search-results');
    if (status)  status.textContent = 'Searching…';
    if (results) results.innerHTML  = '';
    try {
      const res  = await fetch(`api/bible.php?action=search&q=${encodeURIComponent(q)}&version=${curVersion}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const count = data.results.length, total = data.total;
      if (status) status.textContent = count === 0 ? 'No results.'
        : count < total ? `Showing first ${count} of ${total} results` : `${total} result${total !== 1 ? 's' : ''}`;
      if (results) {
        results.innerHTML = data.results.map(r => {
          const chapTotal = totalChapForBook(r.book_num) || 1;
          return `<div class="bible-search-result" onclick="BibleReader.goToSearchResult(${r.book_num},'${escAttr(r.book_name)}',${r.chapter},${r.verse},${chapTotal})">
            <div class="bible-search-ref">${escHtml(r.book_name)} ${r.chapter}:${r.verse}</div>
            <div class="bible-search-snippet">${highlightQuery(r.text, q)}</div>
          </div>`;
        }).join('');
      }
    } catch(e) {
      if (status) status.textContent = 'Search failed: ' + e.message;
    }
  }

  function highlightQuery(text, q) {
    const safe = escHtml(text);
    const re   = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return safe.replace(re, m => `<mark class="hl-search">${m}</mark>`);
  }

  function goToSearchResult(bookNum, bookName, chapter, verse, chapTotal) {
    if (!allBooks) allBooks = booksCache[curVersion] || [];
    curBook       = allBooks.find(b => b.book_num === bookNum) || { book_num: bookNum, book_name: bookName, chapters: chapTotal };
    totalChapters = chapTotal;
    openReader(bookNum, bookName, chapter, chapTotal).then(() => {
      setTimeout(() => {
        const el   = document.querySelector(`.bible-verse[data-verse="${verse}"]`);
        const body = document.getElementById('bible-reader-body');
        if (el && body) {
          // Scroll within the reader container (not the page) so the header stays fixed
          body.scrollTop = Math.max(0, el.offsetTop - 16);
        }
      }, 350);
    });
  }

  // ── Utility ───────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) {
    return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function totalChapForBook(bookNum) {
    if (!allBooks) return 1;
    return allBooks.find(b => b.book_num === bookNum)?.chapters || 1;
  }

  // ── ABHIL82 Download ─────────────────────────────────────────
  let dl = {
    active: false,
    cancelled: false,
    booksDone: 0,
    totalBooks: 66,
    totalChapters: 1189,
    chapsDone: 0,
  };

  const BOOK_CHAPTERS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];

  function openAbhil82Setup() {
    const modal = document.getElementById('abhil82-setup-modal');
    if (modal) modal.style.display = 'flex';
    renderSetupIdle('Checking…');
    checkAbhil82Status();
  }

  function closeAbhil82Setup() {
    const modal = document.getElementById('abhil82-setup-modal');
    if (modal) modal.style.display = 'none';
    if (dl.active) dl.cancelled = true;
  }

  async function checkAbhil82Status() {
    try {
      const r = await fetch('api/scrape_abhil82.php?action=check');
      const d = await r.json();
      const done = d.done_books || [];
      dl.booksDone = done.length;
      dl.chapsDone = done.reduce((s, n) => s + (BOOK_CHAPTERS[n-1] || 0), 0);
      if (done.length === 0) {
        renderSetupIdle('Ready to download. Requires internet connection on your device.');
      } else if (done.length === 66) {
        renderSetupDone('All 66 books downloaded. Click Finalize to apply.');
      } else {
        renderSetupResume(done);
      }
    } catch (e) {
      renderSetupIdle('Could not check status. Make sure the server is running.');
    }
  }

  function renderSetupIdle(msg) {
    const body = document.getElementById('abhil82-setup-body');
    if (!body) return;
    body.innerHTML = `
      <p class="abhil82-info">${escHtml(msg)}</p>
      <p class="abhil82-desc">This will download 1,189 chapters (~31,000 verses) of the
        ABHIL82 Hiligaynon Bible from bible.com. Requires ~5–8 minutes with good internet.</p>
      <button class="abhil82-btn-primary" onclick="BibleReader.testThenStartDownload()">Test &amp; Start Download</button>
    `;
  }

  function renderSetupResume(doneBooksArr) {
    const body = document.getElementById('abhil82-setup-body');
    if (!body) return;
    const remaining = 66 - doneBooksArr.length;
    body.innerHTML = `
      <p class="abhil82-info">In progress: ${doneBooksArr.length}/66 books downloaded.</p>
      <div class="abhil82-progress-wrap">
        <div class="abhil82-progress-bar" style="width:${Math.round(doneBooksArr.length/66*100)}%"></div>
      </div>
      <p class="abhil82-pct">${Math.round(doneBooksArr.length/66*100)}% — ${remaining} books remaining</p>
      <button class="abhil82-btn-primary" onclick="BibleReader.startAbhil82Download(${doneBooksArr.length+1})">Resume Download</button>
      <button class="abhil82-btn-secondary" onclick="BibleReader.resetAbhil82()">Start Over</button>
    `;
  }

  function renderSetupDone(msg) {
    const body = document.getElementById('abhil82-setup-body');
    if (!body) return;
    body.innerHTML = `
      <p class="abhil82-info">${escHtml(msg)}</p>
      <div class="abhil82-progress-wrap"><div class="abhil82-progress-bar" style="width:100%"></div></div>
      <button class="abhil82-btn-primary" onclick="BibleReader.finalizeAbhil82()">Finalize &amp; Apply</button>
      <button class="abhil82-btn-secondary" onclick="BibleReader.resetAbhil82()">Re-download</button>
    `;
  }

  function renderSetupProgress(bookNum, bookName, booksDone, chapsDone) {
    const body = document.getElementById('abhil82-setup-body');
    if (!body) return;
    const pct = Math.round(booksDone / 66 * 100);
    body.innerHTML = `
      <p class="abhil82-info">Downloading… Book ${booksDone}/66</p>
      <div class="abhil82-progress-wrap">
        <div class="abhil82-progress-bar" style="width:${pct}%"></div>
      </div>
      <p class="abhil82-pct">${pct}% — ${bookName}</p>
      <p class="abhil82-chaps">${chapsDone.toLocaleString()} / 1,189 chapters done</p>
      <button class="abhil82-btn-cancel" onclick="BibleReader.cancelAbhil82()">Cancel</button>
    `;
  }

  async function testThenStartDownload() {
    const body = document.getElementById('abhil82-setup-body');
    if (body) body.innerHTML = '<p class="abhil82-info">Testing connection to bible.com…</p>';
    try {
      const r = await fetch('api/scrape_abhil82.php?action=test');
      const d = await r.json();
      if (!d.success) {
        if (body) body.innerHTML = `<p class="abhil82-info abhil82-error">Cannot reach bible.com: ${escHtml(d.error||'Unknown error')}</p>
          <p class="abhil82-desc">Make sure your device has internet access and try again.</p>
          <button class="abhil82-btn-secondary" onclick="BibleReader.testThenStartDownload()">Retry</button>
          <button class="abhil82-btn-secondary" onclick="BibleReader.closeAbhil82Setup()">Close</button>`;
        return;
      }
      if (body) body.innerHTML = `<p class="abhil82-info abhil82-ok">Connected! Got Genesis 1 (${d.verse_count} verses). Starting download…</p>`;
      await new Promise(r => setTimeout(r, 800));
      startAbhil82Download(1);
    } catch (e) {
      if (body) body.innerHTML = `<p class="abhil82-info abhil82-error">Network error: ${escHtml(String(e))}</p>
        <button class="abhil82-btn-secondary" onclick="BibleReader.testThenStartDownload()">Retry</button>`;
    }
  }

  async function startAbhil82Download(fromBook) {
    dl.active    = true;
    dl.cancelled = false;

    for (let book = fromBook; book <= 66; book++) {
      if (dl.cancelled) {
        renderSetupResume(Array.from({length: book - 1}, (_, i) => i + 1));
        dl.active = false;
        return;
      }
      renderSetupProgress(book, `Book ${book}`, book - 1, dl.chapsDone);

      try {
        const r = await fetch(`api/scrape_abhil82.php?action=scrape&book=${book}`);
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Server error');
        dl.chapsDone += (BOOK_CHAPTERS[book-1] || 0);
        renderSetupProgress(book, d.name, book, dl.chapsDone);
      } catch (e) {
        const body = document.getElementById('abhil82-setup-body');
        if (body) body.innerHTML = `<p class="abhil82-info abhil82-error">Error on book ${book}: ${escHtml(String(e))}</p>
          <button class="abhil82-btn-primary" onclick="BibleReader.startAbhil82Download(${book})">Retry Book</button>
          <button class="abhil82-btn-secondary" onclick="BibleReader.cancelAbhil82()">Stop</button>`;
        dl.active = false;
        return;
      }
    }

    dl.active = false;
    renderSetupDone('All 66 books downloaded! Click Finalize to save and apply.');
  }

  function cancelAbhil82() {
    dl.cancelled = true;
  }

  async function finalizeAbhil82() {
    const body = document.getElementById('abhil82-setup-body');
    if (body) body.innerHTML = '<p class="abhil82-info">Saving ABHIL82 Bible data…</p>';
    try {
      const r = await fetch('api/scrape_abhil82.php?action=finalize');
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      if (body) body.innerHTML = `
        <p class="abhil82-info abhil82-ok">Done! ${(d.total_verses||0).toLocaleString()} verses saved.</p>
        <p class="abhil82-desc">The ABHIL82 Bible is ready. Reload the app to start reading the actual Hiligaynon text.</p>
        <button class="abhil82-btn-primary" onclick="location.reload()">Reload App</button>
      `;
      // Invalidate cache so it reloads
      delete booksCache['abhil82'];
    } catch (e) {
      if (body) body.innerHTML = `<p class="abhil82-info abhil82-error">Finalize failed: ${escHtml(String(e))}</p>
        <button class="abhil82-btn-secondary" onclick="BibleReader.finalizeAbhil82()">Retry</button>`;
    }
  }

  async function resetAbhil82() {
    const body = document.getElementById('abhil82-setup-body');
    if (body) body.innerHTML = '<p class="abhil82-info">Clearing progress…</p>';
    try {
      await fetch('api/scrape_abhil82.php?action=reset');
      dl.booksDone = 0;
      dl.chapsDone = 0;
      renderSetupIdle('Progress cleared. Ready to start fresh.');
    } catch (e) {
      renderSetupIdle('Error clearing. Try again.');
    }
  }

  return {
    open, openBook, selectChapter, continueReading,
    nextChapter, prevChapter, toggleBookmark,
    openSearch, closeSearch, onSearchInput, goToSearchResult,
    applyHighlight, clearHighlight,
    backToBooks, backToChapters, backFromBible,
    setVersion,
    openAbhil82Setup, closeAbhil82Setup, testThenStartDownload,
    startAbhil82Download, cancelAbhil82, finalizeAbhil82, resetAbhil82,
  };
})();
