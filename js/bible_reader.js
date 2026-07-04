/* ============================================================
   KJV Bible Reader
   Screens: screen-bible (books) → screen-bible-chapters → screen-bible-reader
   ============================================================ */
const BibleReader = (function () {

  const STORAGE_KEY = 'bca_bible';

  let allBooks = null;        // [{book_num, book_name, testament, chapters}]
  let curBook  = null;        // current book object
  let curChapter = 1;
  let totalChapters = 1;
  let isBookmarked = false;

  // ── Persistence ───────────────────────────────────────────
  function loadStorage() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveStorage(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

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

  // ── Navigation helpers ────────────────────────────────────
  function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  // ── Open — Book List ──────────────────────────────────────
  function open() {
    goTo('screen-bible');
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

    if (allBooks) { renderBooks(listEl); return; }

    listEl.innerHTML = '<div class="bible-loading">📖 Loading Bible…</div>';
    try {
      const res = await fetch('api/bible.php?action=books');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
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
      const res = await fetch(`api/bible.php?action=text&book=${bookNum}&ch=${chapter}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      totalChapters = data.total_chapters;
      updateReaderNav(bookNum, bookName, chapter, data.total_chapters);

      body.innerHTML = data.verses.map(v =>
        `<p class="bible-verse"><span class="bible-verse-num">${v.verse}</span>${escHtml(v.text)}</p>`
      ).join('');
      body.scrollTop = 0;

      setupSwipe(body, bookNum, bookName, data.total_chapters);
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
  function backFromBible()  { goTo('screen-history'); }

  // ── Utility ───────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    open, openBook, selectChapter, continueReading,
    nextChapter, prevChapter, toggleBookmark,
    backToBooks, backToChapters, backFromBible
  };
})();
