/* ============================================================
   Bible Challenge Arena - Custom Question Loader
   Fetches admin-uploaded CSV questions (api/get_custom_questions.php)
   once per page load and merges them into BookQuestions' in-memory
   bank, so every device in a room (host and players) sees the exact
   same expanded pool before any question lookup happens.
   ============================================================ */
const CustomQuestions = (function () {
  let loadPromise = null;

  function fetchAndMerge() {
    return fetch('api/get_custom_questions.php')
      .then(r => r.json())
      .then(res => {
        if (res && res.success && typeof BookQuestions !== 'undefined') {
          BookQuestions.mergeCustom(res.questions || []);
        }
      })
      .catch(() => { /* offline/no server - just play with the built-in bank */ });
  }

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = fetchAndMerge();
    return loadPromise;
  }

  function ready() {
    return loadPromise || load();
  }

  // Re-fetches after an admin CSV upload. mergeCustom() dedupes by id, so
  // calling this repeatedly only ever adds the newly inserted questions.
  function refresh() {
    return fetchAndMerge();
  }

  return { load, ready, refresh };
})();
