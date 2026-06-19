/* ============================================================
   Bible Challenge Arena - Emoji Story Clue Data
   Each round shows an emoji sequence; players type which Bible
   character or event it represents. `type` is either 'character'
   (answer must be exactly one word, e.g. a name) or 'event'
   (answer must be 2-3 words, e.g. a short story title) - enforced
   client-side in multiplayer.js's submitEmojiClue() and shown to
   the player via the round's hint badge. `answers` lists every
   accepted phrasing already trimmed to fit that word-count rule;
   matching strips spaces/punctuation and lowercases (see
   normalizeAnswer()), so list variants without worrying about
   exact spacing. `display` is the canonical text shown on reveal.
   ============================================================ */
const EmojiClueData = {
  ROUNDS: [
    { emojis: "🌊🚣🐦🌈", display: "Noah's Ark", type: "event",
      answers: ["Noah's Ark", "Noahs Ark", "The Flood"],
      reference: "Genesis 6-9" },

    { emojis: "🍎🐍🌳", display: "Adam and Eve", type: "event",
      answers: ["Adam and Eve", "Adam & Eve", "Garden of Eden"],
      reference: "Genesis 3" },

    { emojis: "🪨🤺🗿", display: "David and Goliath", type: "character",
      answers: ["David", "Goliath"],
      reference: "1 Samuel 17" },

    { emojis: "🦁🕳️🙏", display: "Daniel in the Lion's Den", type: "event",
      answers: ["The Lion's Den", "The Lions Den", "Lion's Den", "Lions Den"],
      reference: "Daniel 6" },

    { emojis: "🐳🌊🙏", display: "Jonah and the Whale", type: "character",
      answers: ["Jonah"],
      reference: "Jonah 1-2" },

    { emojis: "🔥🌳👞", display: "The Burning Bush", type: "event",
      answers: ["The Burning Bush", "Burning Bush"],
      reference: "Exodus 3" },

    { emojis: "🌊🙌🚶", display: "Crossing the Red Sea", type: "event",
      answers: ["The Red Sea", "Red Sea", "Red Sea Crossing"],
      reference: "Exodus 14" },

    { emojis: "🍞🐟👨‍👨‍👦‍👦", display: "Feeding the 5,000", type: "event",
      answers: ["Feeding the 5000", "Feeding the 5,000", "Loaves and Fishes"],
      reference: "Matthew 14:13-21" },

    { emojis: "🏺🍷💧", display: "Water into Wine", type: "event",
      answers: ["Water into Wine", "Wedding at Cana"],
      reference: "John 2:1-11" },

    { emojis: "✝️🪦🌅", display: "The Resurrection", type: "event",
      answers: ["The Resurrection", "Jesus' Resurrection", "Jesus Resurrection"],
      reference: "Matthew 28" },

    { emojis: "👶⭐🐑", display: "The Nativity", type: "event",
      answers: ["The Nativity", "Birth of Jesus", "Jesus' Birth", "Jesus Birth", "Christmas Story"],
      reference: "Luke 2" },

    { emojis: "✂️💇‍♂️💪", display: "Samson and Delilah", type: "character",
      answers: ["Samson", "Delilah"],
      reference: "Judges 16" },

    { emojis: "🪄🐍👑", display: "Moses' Staff", type: "event",
      answers: ["Moses' Staff", "Moses Staff", "Moses and Pharaoh"],
      reference: "Exodus 7" },

    { emojis: "🦗🐸🩸", display: "The Ten Plagues", type: "event",
      answers: ["The Ten Plagues", "Ten Plagues", "Plagues of Egypt"],
      reference: "Exodus 7-12" },

    { emojis: "🏃🧂👀", display: "Lot's Wife", type: "event",
      answers: ["Lot's Wife", "Lots Wife", "Sodom and Gomorrah"],
      reference: "Genesis 19" },

    { emojis: "🗼🌍🗣️", display: "Tower of Babel", type: "event",
      answers: ["Tower of Babel"],
      reference: "Genesis 11" },

    { emojis: "🐐🔥🙏", display: "Sacrifice of Isaac", type: "event",
      answers: ["Sacrifice of Isaac", "Abraham and Isaac", "Abraham Sacrifices Isaac"],
      reference: "Genesis 22" },

    { emojis: "👑🧠⚖️", display: "Solomon's Wisdom", type: "character",
      answers: ["Solomon"],
      reference: "1 Kings 3" },

    { emojis: "🪜👼🌙", display: "Jacob's Ladder", type: "event",
      answers: ["Jacob's Ladder", "Jacobs Ladder", "Jacob's Dream", "Jacobs Dream"],
      reference: "Genesis 28" },

    { emojis: "🧥🌈🕳️", display: "Joseph's Coat of Many Colors", type: "event",
      answers: ["Joseph's Coat", "Josephs Coat", "Sold into Slavery"],
      reference: "Genesis 37" },

    { emojis: "🚪🐑🩸", display: "The Passover", type: "event",
      answers: ["The Passover", "Passover Lamb"],
      reference: "Exodus 12" },

    { emojis: "🐂✨🙇", display: "The Golden Calf", type: "event",
      answers: ["The Golden Calf", "Golden Calf"],
      reference: "Exodus 32" },

    { emojis: "📯🧱🚶‍♂️", display: "The Walls of Jericho", type: "event",
      answers: ["Walls of Jericho", "Battle of Jericho"],
      reference: "Joshua 6" },

    { emojis: "🐟🪙👅", display: "Peter and the Coin in the Fish", type: "character",
      answers: ["Peter"],
      reference: "Matthew 17:24-27" },

    { emojis: "👦🧥🩸🐍", display: "Joseph Sold by His Brothers", type: "event",
      answers: ["Sold into Slavery", "Joseph's Brothers"],
      reference: "Genesis 37" },

    { emojis: "👑🌾💤🌾", display: "Pharaoh's Dream", type: "event",
      answers: ["Pharaoh's Dream", "Pharaohs Dream"],
      reference: "Genesis 41" },

    { emojis: "🧺👶🌊👸", display: "Baby Moses in the Basket", type: "event",
      answers: ["Baby Moses", "Moses' Basket"],
      reference: "Exodus 2" },

    { emojis: "📜🪨🔥⛰️", display: "The Ten Commandments", type: "event",
      answers: ["The Ten Commandments", "Ten Commandments", "Mount Sinai"],
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

    { emojis: "🎵🪕👑", display: "David Plays for Saul", type: "event",
      answers: ["David and Saul", "David's Harp"],
      reference: "1 Samuel 16:23" },

    { emojis: "👬💔🏹", display: "David and Jonathan", type: "character",
      answers: ["David", "Jonathan"],
      reference: "1 Samuel 18-20" },

    { emojis: "👑😢🎶", display: "David Mourns Saul and Jonathan", type: "event",
      answers: ["David's Lament", "Davids Lament"],
      reference: "2 Samuel 1" },

    { emojis: "🏠👀💌", display: "David and Bathsheba", type: "character",
      answers: ["David", "Bathsheba"],
      reference: "2 Samuel 11" },

    { emojis: "👑🧠⚖️👶", display: "Solomon's Judgment", type: "event",
      answers: ["Solomon's Judgment", "Solomons Judgment", "Wisdom of Solomon"],
      reference: "1 Kings 3:16-28" },

    { emojis: "👸🏜️🎁", display: "The Queen of Sheba", type: "event",
      answers: ["Queen of Sheba"],
      reference: "1 Kings 10" },

    { emojis: "🏺🫙🛢️", display: "The Widow's Oil", type: "event",
      answers: ["The Widow's Oil", "Widow's Oil", "Widows Oil"],
      reference: "1 Kings 17:8-16; 2 Kings 4:1-7" },

    { emojis: "🔥🆚🐂", display: "Elijah and the Prophets of Baal", type: "event",
      answers: ["Prophets of Baal", "Mount Carmel"],
      reference: "1 Kings 18" },

    { emojis: "🌪️🆙☁️", display: "Elijah's Chariot of Fire", type: "event",
      answers: ["Chariot of Fire", "Elijah's Chariot", "Elijahs Chariot"],
      reference: "2 Kings 2:11" },

    { emojis: "👦🪖🌊7️⃣", display: "Naaman Healed in the Jordan", type: "character",
      answers: ["Naaman"],
      reference: "2 Kings 5" },

    { emojis: "👨‍👨‍👦🔥🚶", display: "Shadrach, Meshach, and Abednego", type: "event",
      answers: ["Fiery Furnace", "The Fiery Furnace", "Three Men"],
      reference: "Daniel 3" },

    { emojis: "✋📝🧱", display: "Belshazzar's Feast", type: "event",
      answers: ["Belshazzar's Feast", "Belshazzars Feast", "Writing on Wall"],
      reference: "Daniel 5" },

    { emojis: "👑🐂🌾", display: "Nebuchadnezzar's Dream", type: "event",
      answers: ["Nebuchadnezzar's Dream", "Nebuchadnezzars Dream"],
      reference: "Daniel 2" },

    { emojis: "👸🕯️📯", display: "Esther Saves Her People", type: "character",
      answers: ["Esther"],
      reference: "Esther 4-8" },

    { emojis: "🤕😢🤝", display: "The Suffering of Job", type: "character",
      answers: ["Job"],
      reference: "Job 1-2" },

    { emojis: "👶⭐🐫🐫🐫", display: "The Wise Men Visit Jesus", type: "event",
      answers: ["The Wise Men", "Three Wise Men", "The Magi"],
      reference: "Matthew 2:1-12" },

    { emojis: "🕊️💧👳", display: "The Baptism of Jesus", type: "event",
      answers: ["Jesus' Baptism", "Jesus Baptism", "The Baptism"],
      reference: "Matthew 3:13-17" },

    { emojis: "😈🍞🏜️", display: "The Temptation of Jesus", type: "event",
      answers: ["Temptation of Jesus", "The Temptation"],
      reference: "Matthew 4:1-11" },

    { emojis: "✨🧔➡️👴", display: "The Transfiguration", type: "event",
      answers: ["The Transfiguration", "Jesus' Transfiguration"],
      reference: "Matthew 17:1-8" },

    { emojis: "🛏️🚶‍♂️🙌", display: "Jesus Heals the Paralytic", type: "event",
      answers: ["Healing the Paralytic", "The Paralytic"],
      reference: "Mark 2:1-12" },

    { emojis: "🌊🛑🤫", display: "Jesus Calms the Storm", type: "event",
      answers: ["Calming the Storm", "Calms the Storm"],
      reference: "Mark 4:35-41" },

    { emojis: "🚶‍♂️🌊👀", display: "Jesus Walks on Water", type: "event",
      answers: ["Walking on Water", "Walks on Water"],
      reference: "Matthew 14:22-33" },

    { emojis: "🩸👗🙏", display: "The Woman with the Issue of Blood", type: "event",
      answers: ["Issue of Blood", "Touched His Garment"],
      reference: "Mark 5:25-34" },

    { emojis: "👧💤🙌", display: "Jairus' Daughter", type: "character",
      answers: ["Jairus"],
      reference: "Mark 5:21-43" },

    { emojis: "👁️🙏👁️", display: "Jesus Heals a Blind Man", type: "character",
      answers: ["Bartimaeus"],
      reference: "Mark 10:46-52" },

    { emojis: "🥖🐟4️⃣7️⃣", display: "Feeding the 4,000", type: "event",
      answers: ["Feeding the 4000", "Feeding the 4,000"],
      reference: "Matthew 15:32-38" },

    { emojis: "🐴🌿👋", display: "The Triumphal Entry", type: "event",
      answers: ["Triumphal Entry", "Palm Sunday"],
      reference: "Matthew 21:1-11" },

    { emojis: "🪙🪙🪙", display: "Judas Betrays Jesus", type: "character",
      answers: ["Judas"],
      reference: "Matthew 26:14-16" },

    { emojis: "🍞🍷🕊️", display: "The Last Supper", type: "event",
      answers: ["The Last Supper", "Last Supper"],
      reference: "Matthew 26:26-29" },

    { emojis: "🌿😢🙏", display: "Jesus Prays in Gethsemane", type: "event",
      answers: ["Garden of Gethsemane", "Prays in Gethsemane"],
      reference: "Matthew 26:36-46" },

    { emojis: "🐓😭3️⃣", display: "Peter Denies Jesus", type: "character",
      answers: ["Peter"],
      reference: "Matthew 26:69-75" },

    { emojis: "👑🩸✝️", display: "The Crucifixion", type: "event",
      answers: ["The Crucifixion", "Jesus' Crucifixion"],
      reference: "Matthew 27:32-50" },

    { emojis: "👆🩹❓", display: "Doubting Thomas", type: "character",
      answers: ["Thomas"],
      reference: "John 20:24-29" },

    { emojis: "🐟🛥️3️⃣🔥", display: "Jesus Appears by the Sea of Galilee", type: "event",
      answers: ["Sea of Galilee", "Breakfast on Beach"],
      reference: "John 21:1-14" },

    { emojis: "☁️🙌👋", display: "The Ascension", type: "event",
      answers: ["The Ascension", "Jesus' Ascension"],
      reference: "Acts 1:9-11" },

    { emojis: "🔥💨🗣️", display: "The Day of Pentecost", type: "event",
      answers: ["Day of Pentecost", "Tongues of Fire"],
      reference: "Acts 2" },

    { emojis: "⚡🐎🗣️", display: "Saul's Conversion", type: "event",
      answers: ["Road to Damascus", "Saul's Conversion", "Paul's Conversion"],
      reference: "Acts 9:1-9" },

    { emojis: "🌳🍎🙅", display: "Adam and Eve Hide from God", type: "event",
      answers: ["Fall of Man", "Hide from God"],
      reference: "Genesis 3:8-10" },

    { emojis: "🚣‍♂️🐦🌳", display: "Noah Sends Out the Dove", type: "event",
      answers: ["Noah's Dove", "Noahs Dove", "Olive Branch"],
      reference: "Genesis 8:8-11" },

    { emojis: "🌈☁️✝️", display: "God's Covenant with Noah", type: "event",
      answers: ["Rainbow Covenant", "Noah's Rainbow", "Noahs Rainbow"],
      reference: "Genesis 9:12-17" },

    { emojis: "🐫🤵💍", display: "Isaac and Rebekah", type: "character",
      answers: ["Isaac", "Rebekah"],
      reference: "Genesis 24" },

    { emojis: "🤼‍♂️🌙🦵", display: "Jacob Wrestles with the Angel", type: "event",
      answers: ["Jacob's Wrestling Match", "Jacobs Wrestling Match", "Wrestles the Angel"],
      reference: "Genesis 32:24-30" },

    { emojis: "👑🍞🇪🇬", display: "Joseph Reunites with His Brothers", type: "event",
      answers: ["Joseph Reveals Himself", "Reunites with Brothers"],
      reference: "Genesis 45" }
  ]
};
