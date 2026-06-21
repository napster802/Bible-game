// Drawable Bible nouns for the "Sketch & Guess" game mode. The server only
// ever stores/transmits an INDEX into WORDS (see api/db.php's
// DRAW_WORD_BANK_SIZE and pickDrawWordChoices()) - mirrors js/impostor_data.js's
// PAIRS convention. Keep WORDS.length in sync with DRAW_WORD_BANK_SIZE if
// entries are added or removed.
(function () {
    const WORDS = [
        // Characters
        { word: 'Noah', aliases: [] },
        { word: 'Moses', aliases: [] },
        { word: 'David', aliases: [] },
        { word: 'Goliath', aliases: ['giant'] },
        { word: 'Samson', aliases: [] },
        { word: 'Jonah', aliases: [] },
        { word: 'Daniel', aliases: [] },
        { word: 'Solomon', aliases: [] },
        { word: 'Adam', aliases: [] },
        { word: 'Eve', aliases: [] },
        { word: 'Abraham', aliases: [] },
        { word: 'Joseph', aliases: [] },
        { word: 'Esther', aliases: [] },
        { word: 'Ruth', aliases: [] },
        { word: 'Peter', aliases: [] },
        { word: 'Paul', aliases: [] },
        { word: 'Judas', aliases: [] },
        // Things
        { word: 'Ark', aliases: ['boat'] },
        { word: 'Cross', aliases: ['crucifix'] },
        { word: 'Crown', aliases: [] },
        { word: 'Sword', aliases: ['blade'] },
        { word: 'Shield', aliases: [] },
        { word: 'Harp', aliases: ['lyre'] },
        { word: 'Scroll', aliases: ['parchment'] },
        { word: 'Manna', aliases: ['bread'] },
        { word: 'Trumpet', aliases: ['horn'] },
        { word: 'Rainbow', aliases: [] },
        // Places
        { word: 'Eden', aliases: ['garden'] },
        { word: 'Babel', aliases: ['tower'] },
        { word: 'Bethlehem', aliases: [] },
        { word: 'Jerusalem', aliases: [] },
        { word: 'Sinai', aliases: [] },
        { word: 'Egypt', aliases: [] },
        { word: 'Nazareth', aliases: [] },
        // Animals
        { word: 'Lion', aliases: [] },
        { word: 'Camel', aliases: [] },
        { word: 'Donkey', aliases: ['mule'] },
        { word: 'Whale', aliases: ['fish'] },
        { word: 'Serpent', aliases: ['snake'] },
        { word: 'Sheep', aliases: ['lamb'] },
    ];

    function normalize(str) {
        return String(str || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
    }

    function matchesGuess(idx, guess) {
        const entry = WORDS[idx];
        if (!entry) return false;
        const g = normalize(guess);
        if (!g) return false;
        const candidates = [entry.word].concat(entry.aliases || []).map(normalize);
        return candidates.includes(g);
    }

    window.DrawingWords = { WORDS, normalize, matchesGuess };
})();
