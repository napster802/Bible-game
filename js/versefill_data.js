/* ============================================================
   Bible Challenge Arena - Verse Fill-in-the-Blank Data
   Each round shows a well-known verse with one word replaced by
   a blank; players type the missing word. No choices shown, so
   matching is a normalized (lowercase, punctuation-stripped)
   string comparison against `answer` - see normalizeAnswer().
   ============================================================ */
const VerseFillData = {
  ROUNDS: [
    { verse: "For _____ so loved the world, that he gave his only begotten Son.",
      answer: "God", reference: "John 3:16" },

    { verse: "The Lord is my _____; I shall not want.",
      answer: "shepherd", reference: "Psalm 23:1" },

    { verse: "I can do all things through _____ which strengtheneth me.",
      answer: "Christ", reference: "Philippians 4:13" },

    { verse: "Trust in the Lord with all thine _____, and lean not unto thine own understanding.",
      answer: "heart", reference: "Proverbs 3:5" },

    { verse: "In the beginning God created the _____ and the earth.",
      answer: "heaven", reference: "Genesis 1:1" },

    { verse: "For all have sinned, and come short of the _____ of God.",
      answer: "glory", reference: "Romans 3:23" },

    { verse: "But seek ye first the kingdom of God, and his _____; and all these things shall be added unto you.",
      answer: "righteousness", reference: "Matthew 6:33" },

    { verse: "This is the day which the Lord hath made; we will rejoice and be _____ in it.",
      answer: "glad", reference: "Psalm 118:24" },

    { verse: "Be still, and know that I am _____.",
      answer: "God", reference: "Psalm 46:10" },

    { verse: "And we know that all things work together for _____ to them that love God.",
      answer: "good", reference: "Romans 8:28" },

    { verse: "Greater love hath no man than this, that a man lay down his _____ for his friends.",
      answer: "life", reference: "John 15:13" },

    { verse: "The Lord bless thee, and keep _____.",
      answer: "thee", reference: "Numbers 6:24" },

    { verse: "And God said, Let there be _____: and there was light.",
      answer: "light", reference: "Genesis 1:3" },

    { verse: "Love your _____, do good to them which hate you.",
      answer: "enemies", reference: "Luke 6:27" },

    { verse: "Ask, and it shall be _____ you; seek, and ye shall find.",
      answer: "given", reference: "Matthew 7:7" },

    { verse: "Many waters cannot quench _____, neither can the floods drown it.",
      answer: "love", reference: "Song of Solomon 8:7" },

    { verse: "Thy word is a lamp unto my feet, and a _____ unto my path.",
      answer: "light", reference: "Psalm 119:105" },

    { verse: "Faith is the substance of things hoped for, the evidence of things not _____.",
      answer: "seen", reference: "Hebrews 11:1" },

    { verse: "For where two or three are gathered together in my _____, there am I in the midst of them.",
      answer: "name", reference: "Matthew 18:20" },

    { verse: "The Lord is my light and my _____; whom shall I fear?",
      answer: "salvation", reference: "Psalm 27:1" },

    { verse: "Children, obey your parents in the Lord: for this is _____.",
      answer: "right", reference: "Ephesians 6:1" },

    { verse: "Be strong and of a good _____; be not afraid, neither be thou dismayed.",
      answer: "courage", reference: "Joshua 1:9" },

    { verse: "He that believeth on the Son hath everlasting _____.",
      answer: "life", reference: "John 3:36" },

    { verse: "Delight thyself also in the Lord; and he shall give thee the desires of thine _____.",
      answer: "heart", reference: "Psalm 37:4" },

    { verse: "The _____ of the Lord is the beginning of wisdom.",
      answer: "fear", reference: "Psalm 111:10" },

    { verse: "Thou shalt love thy neighbour as thy _____.",
      answer: "self", reference: "Matthew 22:39" },

    { verse: "And the Word was made _____, and dwelt among us.",
      answer: "flesh", reference: "John 1:14" },

    { verse: "Jesus _____.",
      answer: "wept", reference: "John 11:35" },

    { verse: "But they that wait upon the Lord shall renew their _____.",
      answer: "strength", reference: "Isaiah 40:31" },

    { verse: "For I am persuaded, that neither death, nor life... shall be able to separate us from the _____ of God.",
      answer: "love", reference: "Romans 8:38-39" },

    { verse: "There hath no temptation taken you but such as is common to _____.",
      answer: "man", reference: "1 Corinthians 10:13" },

    { verse: "For the wages of sin is _____; but the gift of God is eternal life.",
      answer: "death", reference: "Romans 6:23" },

    { verse: "Be not deceived; God is not _____.",
      answer: "mocked", reference: "Galatians 6:7" },

    { verse: "For we walk by faith, not by _____.",
      answer: "sight", reference: "2 Corinthians 5:7" },

    { verse: "Casting all your care upon him; for he careth for _____.",
      answer: "you", reference: "1 Peter 5:7" },

    { verse: "Above all things have fervent charity among yourselves: for charity shall cover the multitude of _____.",
      answer: "sins", reference: "1 Peter 4:8" },

    { verse: "But the fruit of the Spirit is love, joy, _____, longsuffering, gentleness, goodness, faith.",
      answer: "peace", reference: "Galatians 5:22" },

    { verse: "Finally, brethren, whatsoever things are true... think on these _____.",
      answer: "things", reference: "Philippians 4:8" },

    { verse: "I have learned, in whatsoever state I am, therewith to be _____.",
      answer: "content", reference: "Philippians 4:11" },

    { verse: "Rejoice in the Lord _____: and again I say, Rejoice.",
      answer: "alway", reference: "Philippians 4:4" },

    { verse: "Let not your heart be troubled: ye believe in _____, believe also in me.",
      answer: "God", reference: "John 14:1" },

    { verse: "In my Father's house are many _____.",
      answer: "mansions", reference: "John 14:2" },

    { verse: "I am the way, the truth, and the _____.",
      answer: "life", reference: "John 14:6" },

    { verse: "Peace I leave with you, my peace I give unto _____.",
      answer: "you", reference: "John 14:27" },

    { verse: "Greater love hath no man than this, that a man lay down his life for his _____.",
      answer: "friends", reference: "John 15:13" },

    { verse: "Ye shall know the truth, and the truth shall make you _____.",
      answer: "free", reference: "John 8:32" },

    { verse: "Judge not, that ye be not _____.",
      answer: "judged", reference: "Matthew 7:1" },

    { verse: "Blessed are the poor in spirit: for theirs is the kingdom of _____.",
      answer: "heaven", reference: "Matthew 5:3" },

    { verse: "Blessed are they that mourn: for they shall be _____.",
      answer: "comforted", reference: "Matthew 5:4" },

    { verse: "Blessed are the meek: for they shall inherit the _____.",
      answer: "earth", reference: "Matthew 5:5" },

    { verse: "Ye are the salt of the _____.",
      answer: "earth", reference: "Matthew 5:13" },

    { verse: "Ye are the light of the _____.",
      answer: "world", reference: "Matthew 5:14" },

    { verse: "Therefore all things whatsoever ye would that men should do to you, do ye even so to _____.",
      answer: "them", reference: "Matthew 7:12" },

    { verse: "Come unto me, all ye that labour and are heavy laden, and I will give you _____.",
      answer: "rest", reference: "Matthew 11:28" },

    { verse: "For my yoke is easy, and my burden is _____.",
      answer: "light", reference: "Matthew 11:30" },

    { verse: "Seek, and ye shall _____.",
      answer: "find", reference: "Matthew 7:7" },

    { verse: "For where your treasure is, there will your heart be _____.",
      answer: "also", reference: "Matthew 6:21" },

    { verse: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of _____.",
      answer: "itself", reference: "Matthew 6:34" },

    { verse: "Man shall not live by bread alone, but by every word that proceedeth out of the mouth of _____.",
      answer: "God", reference: "Matthew 4:4" },

    { verse: "The Lord is my shepherd; I shall not _____.",
      answer: "want", reference: "Psalm 23:1" },

    { verse: "Yea, though I walk through the valley of the shadow of death, I will fear no _____.",
      answer: "evil", reference: "Psalm 23:4" },

    { verse: "Surely goodness and mercy shall follow me all the days of my _____.",
      answer: "life", reference: "Psalm 23:6" },

    { verse: "The heavens declare the glory of God; and the firmament sheweth his _____.",
      answer: "handywork", reference: "Psalm 19:1" },

    { verse: "Create in me a clean heart, O God; and renew a right _____ within me.",
      answer: "spirit", reference: "Psalm 51:10" },

    { verse: "As for God, his way is _____.",
      answer: "perfect", reference: "Psalm 18:30" },

    { verse: "Weeping may endure for a night, but joy cometh in the _____.",
      answer: "morning", reference: "Psalm 30:5" },

    { verse: "Cast thy burden upon the Lord, and he shall sustain _____.",
      answer: "thee", reference: "Psalm 55:22" },

    { verse: "I will lift up mine eyes unto the hills, from whence cometh my _____.",
      answer: "help", reference: "Psalm 121:1" },

    { verse: "The Lord shall preserve thee from all evil: he shall preserve thy _____.",
      answer: "soul", reference: "Psalm 121:7" },

    { verse: "Train up a child in the way he should go: and when he is old, he will not depart from _____.",
      answer: "it", reference: "Proverbs 22:6" },

    { verse: "Pride goeth before destruction, and a haughty spirit before a _____.",
      answer: "fall", reference: "Proverbs 16:18" },

    { verse: "A merry heart doeth good like a _____.",
      answer: "medicine", reference: "Proverbs 17:22" },

    { verse: "Where there is no vision, the people _____.",
      answer: "perish", reference: "Proverbs 29:18" },

    { verse: "But my God shall supply all your need according to his riches in _____ by Christ Jesus.",
      answer: "glory", reference: "Philippians 4:19" }
  ]
};
