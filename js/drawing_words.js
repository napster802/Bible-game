// Drawable Bible nouns for the "Sketch & Guess" game mode. The server only
// ever stores/transmits an INDEX into WORDS (see api/db.php's
// DRAW_WORD_BANK_SIZE and pickDrawWordChoices()) - mirrors js/impostor_data.js's
// PAIRS convention. Keep WORDS.length in sync with DRAW_WORD_BANK_SIZE if
// entries are added or removed.
(function () {
    const WORDS = [
        { word: 'Noah\'s Ark', aliases: ['ark', 'noahs ark', 'the ark'] },
        { word: 'Burning Bush', aliases: ['bush', 'the burning bush'] },
        { word: 'David\'s Sling', aliases: ['sling', 'slingshot', 'davids sling'] },
        { word: 'Tower of Babel', aliases: ['babel', 'the tower', 'tower'] },
        { word: 'Ten Commandments', aliases: ['commandments', 'tablets', 'stone tablets'] },
        { word: 'Jonah and the Fish', aliases: ['jonah', 'whale', 'big fish', 'the fish'] },
        { word: 'Dove', aliases: ['the dove', 'peace dove'] },
        { word: 'Rainbow', aliases: ['the rainbow'] },
        { word: 'Manna', aliases: ['bread from heaven'] },
        { word: 'Cross', aliases: ['the cross', 'crucifix'] },
        { word: 'Loaves and Fish', aliases: ['fish and loaves', 'bread and fish'] },
        { word: 'Star of Bethlehem', aliases: ['the star', 'bethlehem star'] },
        { word: 'Golden Calf', aliases: ['calf', 'idol'] },
        { word: 'Ark of the Covenant', aliases: ['covenant box', 'the covenant ark'] },
        { word: 'Lion\'s Den', aliases: ['lions den', 'daniel and the lions'] },
        { word: 'Goliath', aliases: ['the giant'] },
        { word: 'Donkey', aliases: ['the donkey', 'mule'] },
        { word: 'Camel', aliases: ['the camel'] },
        { word: 'Shepherd and Sheep', aliases: ['shepherd', 'sheep', 'flock'] },
        { word: 'Fishing Net', aliases: ['net', 'fishermen'] },
        { word: 'Crown of Thorns', aliases: ['thorns', 'the crown'] },
        { word: 'Angel', aliases: ['the angel', 'angel wings'] },
        { word: 'Trumpet', aliases: ['the trumpet', 'horn'] },
        { word: 'Whale', aliases: ['the whale'] },
        { word: 'Garden of Eden', aliases: ['eden', 'the garden'] },
        { word: 'Apple', aliases: ['the apple', 'forbidden fruit'] },
        { word: 'Serpent', aliases: ['snake', 'the serpent'] },
        { word: 'Olive Branch', aliases: ['olive leaf', 'branch'] },
        { word: 'Candle', aliases: ['the candle', 'lamp'] },
        { word: 'Crown', aliases: ['the crown', 'king\'s crown'] },
        { word: 'Boat', aliases: ['the boat', 'fishing boat'] },
        { word: 'Sword', aliases: ['the sword'] },
        { word: 'Shield', aliases: ['the shield'] },
        { word: 'Harp', aliases: ['the harp', 'lyre'] },
        { word: 'Scroll', aliases: ['the scroll', 'parchment'] },
        { word: 'Well', aliases: ['the well', 'water well' ] },
        { word: 'Vineyard', aliases: ['the vineyard', 'grapes'] },
        { word: 'Sandals', aliases: ['the sandals'] },
        { word: 'Basket', aliases: ['the basket'] },
        { word: 'Pearl', aliases: ['the pearl'] },
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
