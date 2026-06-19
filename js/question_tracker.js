/* ============================================================
   Bible Challenge Arena - Question Tracker
   Remembers which trivia questions this browser has already
   served, scoped per book/category/difficulty/testament pool (or
   per difficulty, for the classic mode), so the Host Lobby can
   exclude them from future games and avoid repeats until the
   host clears progress. Stored in localStorage - this is a
   per-device "seen" list, not a server-wide one.
   ============================================================ */
const QuestionTracker = (function () {
  const STORAGE_KEY = 'bca_asked_questions';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { /* storage unavailable - tracking just won't persist */ }
  }

  function poolKey(opts) {
    return opts.mode === 'book'
      ? `book:${opts.testament}:${opts.book}:${opts.category}:${opts.difficulty}`
      : `diff:${opts.difficulty}`;
  }

  function getAsked(key) {
    const data = load();
    return new Set(data[key] || []);
  }

  function markAsked(key, questionTexts) {
    if (!questionTexts || !questionTexts.length) return;
    const data = load();
    const set = new Set(data[key] || []);
    questionTexts.forEach(t => set.add(t));
    data[key] = Array.from(set);
    save(data);
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { poolKey, getAsked, markAsked, clearAll };
})();
