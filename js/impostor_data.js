/* ============================================================
   Bible Challenge Arena - Word Impostor Data
   Curated Bible word pairs for the Word Impostor game mode. Every
   crew member secretly gets wordA; the one Impostor secretly gets
   wordB instead - close enough to wordA that a vague clue could fit
   either, but different enough to give a sharp-eared crew a chance
   to catch the mismatch. Server only ever ships an index into this
   array (api/host_action.php hardcodes random_int(0, PAIRS.length-1)
   at game start) - never the word text itself - mirroring how
   QUESTION_DB/BookQuestions resolve question text from a db_index.
   ============================================================ */
const ImpostorData = (function () {
  const PAIRS = [
    { category: 'Characters', wordA: 'David', wordB: 'Goliath' },
    { category: 'Characters', wordA: 'Moses', wordB: 'Aaron' },
    { category: 'Characters', wordA: 'Cain', wordB: 'Abel' },
    { category: 'Characters', wordA: 'Jacob', wordB: 'Esau' },
    { category: 'Characters', wordA: 'Peter', wordB: 'Judas' },
    { category: 'Characters', wordA: 'Mary', wordB: 'Martha' },
    { category: 'Characters', wordA: 'Saul', wordB: 'David' },
    { category: 'Characters', wordA: 'Samson', wordB: 'Delilah' },
    { category: 'Characters', wordA: 'Noah', wordB: 'Lot' },
    { category: 'Characters', wordA: 'Joseph', wordB: 'Benjamin' },
    { category: 'Places', wordA: 'Jerusalem', wordB: 'Bethlehem' },
    { category: 'Places', wordA: 'Egypt', wordB: 'Babylon' },
    { category: 'Places', wordA: 'Eden', wordB: 'Sodom' },
    { category: 'Places', wordA: 'Nazareth', wordB: 'Capernaum' },
    { category: 'Places', wordA: 'Jericho', wordB: 'Jordan River' },
    { category: 'Places', wordA: 'Mount Sinai', wordB: 'Mount Carmel' },
    { category: 'Places', wordA: 'Galilee', wordB: 'Judea' },
    { category: 'Objects', wordA: 'Ark of the Covenant', wordB: "Noah's Ark" },
    { category: 'Objects', wordA: 'Manna', wordB: 'Quail' },
    { category: 'Objects', wordA: 'Staff', wordB: 'Rod' },
    { category: 'Objects', wordA: 'Cross', wordB: 'Crown of Thorns' },
    { category: 'Objects', wordA: 'Ten Commandments', wordB: 'Golden Calf' },
    { category: 'Events', wordA: 'The Flood', wordB: 'The Exodus' },
    { category: 'Events', wordA: 'The Crucifixion', wordB: 'The Resurrection' },
    { category: 'Events', wordA: 'Parting of the Red Sea', wordB: "Fall of Jericho's Walls" },
    { category: 'Events', wordA: 'The Last Supper', wordB: "The Lord's Prayer" },
    { category: 'Events', wordA: 'Tower of Babel', wordB: 'Garden of Eden' },
    { category: 'Animals', wordA: 'Lion', wordB: 'Bear' },
    { category: 'Animals', wordA: 'Whale', wordB: 'Dove' },
    { category: 'Characters', wordA: 'John the Baptist', wordB: 'John the Apostle' }
  ];

  return { PAIRS };
})();
