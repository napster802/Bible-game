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
      answer: "heart", reference: "Psalm 37:4" }
  ]
};
