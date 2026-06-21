/* ============================================================
   Bible Challenge Arena - Emoji Story Clue Data
   Each round shows an emoji sequence; players type the single
   Bible noun it represents. `type` is one of 'character', 'thing',
   'place', or 'animal' - every round's answer is always exactly
   ONE WORD, enforced client-side in multiplayer.js's
   submitEmojiClue() and shown to the player via the round's hint
   badge. `answers` lists every accepted one-word phrasing (no
   spaces); matching strips punctuation/case (see normalizeAnswer()),
   so list variants without worrying about exact spelling quirks.
   `display` is the canonical word shown on reveal.
   ============================================================ */
const EmojiClueData = {
  ROUNDS: [
    { emojis: "🌊🚣🐦🌈", display: "Ark", type: "thing",
      answers: ["Ark", "Boat"],
      reference: "Genesis 6-9" },

    { emojis: "🍎🐍🌳", display: "Eden", type: "place",
      answers: ["Eden"],
      reference: "Genesis 3" },

    { emojis: "🪨🤺🗿", display: "David and Goliath", type: "character",
      answers: ["David", "Goliath"],
      reference: "1 Samuel 17" },

    { emojis: "🦁🕳️🙏", display: "Lion", type: "animal",
      answers: ["Lion"],
      reference: "Daniel 6" },

    { emojis: "🐳🌊🙏", display: "Jonah and the Whale", type: "character",
      answers: ["Jonah"],
      reference: "Jonah 1-2" },

    { emojis: "🔥🌳👞", display: "Bush", type: "thing",
      answers: ["Bush"],
      reference: "Exodus 3" },

    { emojis: "🌊🙌🚶", display: "Sea", type: "place",
      answers: ["Sea"],
      reference: "Exodus 14" },

    { emojis: "🍞🐟👨‍👨‍👦‍👦", display: "Bread", type: "thing",
      answers: ["Bread", "Loaves"],
      reference: "Matthew 14:13-21" },

    { emojis: "🏺🍷💧", display: "Wine", type: "thing",
      answers: ["Wine"],
      reference: "John 2:1-11" },

    { emojis: "✝️🪦🌅", display: "Tomb", type: "thing",
      answers: ["Tomb"],
      reference: "Matthew 28" },

    { emojis: "👶⭐🐑", display: "Star", type: "thing",
      answers: ["Star"],
      reference: "Luke 2" },

    { emojis: "✂️💇‍♂️💪", display: "Samson and Delilah", type: "character",
      answers: ["Samson", "Delilah"],
      reference: "Judges 16" },

    { emojis: "🪄🐍👑", display: "Staff", type: "thing",
      answers: ["Staff"],
      reference: "Exodus 7" },

    { emojis: "🦗🐸🩸", display: "Plagues", type: "thing",
      answers: ["Plague", "Plagues"],
      reference: "Exodus 7-12" },

    { emojis: "🏃🧂👀", display: "Salt", type: "thing",
      answers: ["Salt"],
      reference: "Genesis 19" },

    { emojis: "🗼🌍🗣️", display: "Babel", type: "place",
      answers: ["Babel", "Tower"],
      reference: "Genesis 11" },

    { emojis: "🐐🔥🙏", display: "Isaac", type: "character",
      answers: ["Isaac"],
      reference: "Genesis 22" },

    { emojis: "👑🧠⚖️", display: "Solomon's Wisdom", type: "character",
      answers: ["Solomon"],
      reference: "1 Kings 3" },

    { emojis: "🪜👼🌙", display: "Ladder", type: "thing",
      answers: ["Ladder"],
      reference: "Genesis 28" },

    { emojis: "🧥🌈🕳️", display: "Coat", type: "thing",
      answers: ["Coat"],
      reference: "Genesis 37" },

    { emojis: "🚪🐑🩸", display: "Lamb", type: "animal",
      answers: ["Lamb"],
      reference: "Exodus 12" },

    { emojis: "🐂✨🙇", display: "Calf", type: "animal",
      answers: ["Calf"],
      reference: "Exodus 32" },

    { emojis: "📯🧱🚶‍♂️", display: "Jericho", type: "place",
      answers: ["Jericho"],
      reference: "Joshua 6" },

    { emojis: "🐟🪙👅", display: "Peter and the Coin in the Fish", type: "character",
      answers: ["Peter"],
      reference: "Matthew 17:24-27" },

    { emojis: "👑🌾💤🌾", display: "Pharaoh", type: "character",
      answers: ["Pharaoh"],
      reference: "Genesis 41" },

    { emojis: "🧺👶🌊👸", display: "Basket", type: "thing",
      answers: ["Basket"],
      reference: "Exodus 2" },

    { emojis: "📜🪨🔥⛰️", display: "Commandments", type: "thing",
      answers: ["Commandments", "Tablets"],
      reference: "Exodus 20" },

    { emojis: "🦁👧⚔️", display: "Samson and the Lion", type: "character",
      answers: ["Samson"],
      reference: "Judges 14:5-6" },

    { emojis: "👩‍🌾🌾💍", display: "Ruth and Boaz", type: "character",
      answers: ["Ruth", "Boaz"],
      reference: "Ruth 2-4" },

    { emojis: "👦📿🛏️", display: "Samuel's Calling", type: "character",
      answers: ["Samuel"],
      reference: "1 Samuel 3" },

    { emojis: "🎵🪕👑", display: "Harp", type: "thing",
      answers: ["Harp"],
      reference: "1 Samuel 16:23" },

    { emojis: "👬💔🏹", display: "David and Jonathan", type: "character",
      answers: ["David", "Jonathan"],
      reference: "1 Samuel 18-20" },

    { emojis: "🏠👀💌", display: "David and Bathsheba", type: "character",
      answers: ["David", "Bathsheba"],
      reference: "2 Samuel 11" },

    { emojis: "👸🏜️🎁", display: "Sheba", type: "place",
      answers: ["Sheba"],
      reference: "1 Kings 10" },

    { emojis: "🏺🫙🛢️", display: "Oil", type: "thing",
      answers: ["Oil"],
      reference: "1 Kings 17:8-16; 2 Kings 4:1-7" },

    { emojis: "🔥🆚🐂", display: "Elijah", type: "character",
      answers: ["Elijah"],
      reference: "1 Kings 18" },

    { emojis: "🌪️🆙☁️", display: "Chariot", type: "thing",
      answers: ["Chariot"],
      reference: "2 Kings 2:11" },

    { emojis: "👦🪖🌊7️⃣", display: "Naaman Healed in the Jordan", type: "character",
      answers: ["Naaman"],
      reference: "2 Kings 5" },

    { emojis: "👨‍👨‍👦🔥🚶", display: "Furnace", type: "thing",
      answers: ["Furnace"],
      reference: "Daniel 3" },

    { emojis: "✋📝🧱", display: "Belshazzar", type: "character",
      answers: ["Belshazzar"],
      reference: "Daniel 5" },

    { emojis: "👑🐂🌾", display: "Nebuchadnezzar", type: "character",
      answers: ["Nebuchadnezzar"],
      reference: "Daniel 2" },

    { emojis: "👸🕯️📯", display: "Esther Saves Her People", type: "character",
      answers: ["Esther"],
      reference: "Esther 4-8" },

    { emojis: "🤕😢🤝", display: "The Suffering of Job", type: "character",
      answers: ["Job"],
      reference: "Job 1-2" },

    { emojis: "👶⭐🐫🐫🐫", display: "Magi", type: "character",
      answers: ["Magi"],
      reference: "Matthew 2:1-12" },

    { emojis: "🕊️💧👳", display: "Baptism", type: "thing",
      answers: ["Baptism"],
      reference: "Matthew 3:13-17" },

    { emojis: "😈🍞🏜️", display: "Temptation", type: "thing",
      answers: ["Temptation"],
      reference: "Matthew 4:1-11" },

    { emojis: "✨🧔➡️👴", display: "Transfiguration", type: "thing",
      answers: ["Transfiguration"],
      reference: "Matthew 17:1-8" },

    { emojis: "🛏️🚶‍♂️🙌", display: "Paralytic", type: "character",
      answers: ["Paralytic"],
      reference: "Mark 2:1-12" },

    { emojis: "🌊🛑🤫", display: "Storm", type: "thing",
      answers: ["Storm"],
      reference: "Mark 4:35-41" },

    { emojis: "🚶‍♂️🌊👀", display: "Water", type: "thing",
      answers: ["Water"],
      reference: "Matthew 14:22-33" },

    { emojis: "🩸👗🙏", display: "Blood", type: "thing",
      answers: ["Blood"],
      reference: "Mark 5:25-34" },

    { emojis: "👧💤🙌", display: "Jairus' Daughter", type: "character",
      answers: ["Jairus"],
      reference: "Mark 5:21-43" },

    { emojis: "👁️🙏👁️", display: "Jesus Heals a Blind Man", type: "character",
      answers: ["Bartimaeus"],
      reference: "Mark 10:46-52" },

    { emojis: "🐴🌿👋", display: "Palms", type: "thing",
      answers: ["Palm", "Palms"],
      reference: "Matthew 21:1-11" },

    { emojis: "🪙🪙🪙", display: "Judas Betrays Jesus", type: "character",
      answers: ["Judas"],
      reference: "Matthew 26:14-16" },

    { emojis: "🌿😢🙏", display: "Gethsemane", type: "place",
      answers: ["Gethsemane"],
      reference: "Matthew 26:36-46" },

    { emojis: "🐓😭3️⃣", display: "Peter Denies Jesus", type: "character",
      answers: ["Peter"],
      reference: "Matthew 26:69-75" },

    { emojis: "👑🩸✝️", display: "Cross", type: "thing",
      answers: ["Cross"],
      reference: "Matthew 27:32-50" },

    { emojis: "👆🩹❓", display: "Doubting Thomas", type: "character",
      answers: ["Thomas"],
      reference: "John 20:24-29" },

    { emojis: "🐟🛥️3️⃣🔥", display: "Galilee", type: "place",
      answers: ["Galilee"],
      reference: "John 21:1-14" },

    { emojis: "☁️🙌👋", display: "Cloud", type: "thing",
      answers: ["Cloud"],
      reference: "Acts 1:9-11" },

    { emojis: "🔥💨🗣️", display: "Pentecost", type: "thing",
      answers: ["Pentecost"],
      reference: "Acts 2" },

    { emojis: "⚡🐎🗣️", display: "Saul", type: "character",
      answers: ["Saul"],
      reference: "Acts 9:1-9" },

    { emojis: "🚣‍♂️🐦🌳", display: "Dove", type: "animal",
      answers: ["Dove"],
      reference: "Genesis 8:8-11" },

    { emojis: "🌈☁️✝️", display: "Rainbow", type: "thing",
      answers: ["Rainbow"],
      reference: "Genesis 9:12-17" },

    { emojis: "🐫🤵💍", display: "Isaac and Rebekah", type: "character",
      answers: ["Isaac", "Rebekah"],
      reference: "Genesis 24" },

    { emojis: "🤼‍♂️🌙🦵", display: "Angel", type: "thing",
      answers: ["Angel"],
      reference: "Genesis 32:24-30" }
  ]
};
