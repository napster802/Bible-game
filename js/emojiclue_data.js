/* ============================================================
   Bible Challenge Arena - Emoji Story Clue Data
   Each round shows an emoji sequence; players type which Bible
   story/character it represents. `answers` lists every accepted
   phrasing - matching strips spaces/punctuation and lowercases
   (see normalizeAnswer()), so list variants without worrying
   about exact spacing. `display` is the canonical text shown on
   reveal.
   ============================================================ */
const EmojiClueData = {
  ROUNDS: [
    { emojis: "🌊🚣🐦🌈", display: "Noah's Ark",
      answers: ["Noah's Ark", "Noahs Ark", "Noah", "The Flood", "Noah and the Flood"],
      reference: "Genesis 6-9" },

    { emojis: "🍎🐍🌳", display: "Adam and Eve",
      answers: ["Adam and Eve", "Adam & Eve", "The Garden of Eden", "Garden of Eden"],
      reference: "Genesis 3" },

    { emojis: "🪨🤺🗿", display: "David and Goliath",
      answers: ["David and Goliath", "David & Goliath", "Goliath", "David"],
      reference: "1 Samuel 17" },

    { emojis: "🦁🕳️🙏", display: "Daniel in the Lion's Den",
      answers: ["Daniel in the Lion's Den", "Daniel in the Lions Den", "Daniel", "The Lion's Den", "The Lions Den"],
      reference: "Daniel 6" },

    { emojis: "🐳🌊🙏", display: "Jonah and the Whale",
      answers: ["Jonah and the Whale", "Jonah and the Fish", "Jonah", "Jonah and the Big Fish"],
      reference: "Jonah 1-2" },

    { emojis: "🔥🌳👞", display: "Moses and the Burning Bush",
      answers: ["Moses and the Burning Bush", "The Burning Bush", "Burning Bush", "Moses"],
      reference: "Exodus 3" },

    { emojis: "🌊🙌🚶", display: "Crossing the Red Sea",
      answers: ["Crossing the Red Sea", "The Red Sea", "Red Sea", "Moses Parts the Red Sea", "Parting of the Red Sea"],
      reference: "Exodus 14" },

    { emojis: "🍞🐟👨‍👨‍👦‍👦", display: "Feeding the 5,000",
      answers: ["Feeding the 5000", "Feeding the 5,000", "The Feeding of the 5000", "Feeding of the Five Thousand", "Loaves and Fishes"],
      reference: "Matthew 14:13-21" },

    { emojis: "🏺🍷💧", display: "Water into Wine",
      answers: ["Water into Wine", "Wedding at Cana", "Turning Water into Wine", "Jesus Turns Water into Wine"],
      reference: "John 2:1-11" },

    { emojis: "✝️🪦🌅", display: "The Resurrection",
      answers: ["The Resurrection", "Jesus' Resurrection", "Jesus Resurrection", "Resurrection", "Easter"],
      reference: "Matthew 28" },

    { emojis: "👶⭐🐑", display: "The Birth of Jesus",
      answers: ["The Nativity", "Birth of Jesus", "The Birth of Jesus", "Jesus' Birth", "Jesus Birth", "Christmas Story"],
      reference: "Luke 2" },

    { emojis: "✂️💇‍♂️💪", display: "Samson and Delilah",
      answers: ["Samson and Delilah", "Samson & Delilah", "Samson"],
      reference: "Judges 16" },

    { emojis: "🪄🐍👑", display: "Moses and Pharaoh",
      answers: ["Moses and Pharaoh", "Moses' Staff", "Moses Staff", "The Staff Turns to a Snake", "Moses and the Snake"],
      reference: "Exodus 7" },

    { emojis: "🦗🐸🩸", display: "The Ten Plagues",
      answers: ["The Ten Plagues", "Ten Plagues", "The Plagues of Egypt", "Plagues of Egypt"],
      reference: "Exodus 7-12" },

    { emojis: "🏃🧂👀", display: "Lot's Wife",
      answers: ["Lot's Wife", "Lots Wife", "The Destruction of Sodom", "Sodom and Gomorrah"],
      reference: "Genesis 19" },

    { emojis: "🗼🌍🗣️", display: "The Tower of Babel",
      answers: ["The Tower of Babel", "Tower of Babel", "Babel"],
      reference: "Genesis 11" },

    { emojis: "🐐🔥🙏", display: "The Sacrifice of Isaac",
      answers: ["The Sacrifice of Isaac", "Sacrifice of Isaac", "Abraham and Isaac", "Abraham Sacrifices Isaac"],
      reference: "Genesis 22" },

    { emojis: "👑🧠⚖️", display: "Solomon's Wisdom",
      answers: ["Solomon's Wisdom", "Solomons Wisdom", "King Solomon", "Solomon"],
      reference: "1 Kings 3" },

    { emojis: "🪜👼🌙", display: "Jacob's Ladder",
      answers: ["Jacob's Ladder", "Jacobs Ladder", "Jacob's Dream", "Jacobs Dream"],
      reference: "Genesis 28" },

    { emojis: "🧥🌈🕳️", display: "Joseph's Coat of Many Colors",
      answers: ["Joseph's Coat of Many Colors", "Josephs Coat of Many Colors", "Joseph and his Coat", "Joseph Sold by his Brothers", "Joseph"],
      reference: "Genesis 37" },

    { emojis: "🚪🐑🩸", display: "The Passover",
      answers: ["The Passover", "Passover"],
      reference: "Exodus 12" },

    { emojis: "🐂✨🙇", display: "The Golden Calf",
      answers: ["The Golden Calf", "Golden Calf"],
      reference: "Exodus 32" },

    { emojis: "📯🧱🚶‍♂️", display: "The Walls of Jericho",
      answers: ["The Walls of Jericho", "Walls of Jericho", "Battle of Jericho", "Jericho"],
      reference: "Joshua 6" },

    { emojis: "🐟🪙👅", display: "Peter and the Coin in the Fish",
      answers: ["Peter and the Coin in the Fish", "The Coin in the Fish", "Coin in the Fish", "Peter and the Fish"],
      reference: "Matthew 17:24-27" },

    { emojis: "👦🧥🩸🐍", display: "Joseph Sold by His Brothers",
      answers: ["Joseph Sold by His Brothers", "Joseph and His Brothers", "Joseph Sold into Slavery", "Joseph"],
      reference: "Genesis 37" },

    { emojis: "👑🌾💤🌾", display: "Pharaoh's Dream",
      answers: ["Pharaoh's Dream", "Pharaohs Dream", "Joseph Interprets Pharaoh's Dream", "Seven Years of Famine"],
      reference: "Genesis 41" },

    { emojis: "🧺👶🌊👸", display: "Baby Moses in the Basket",
      answers: ["Baby Moses in the Basket", "Moses in the Basket", "Moses in the River", "Baby Moses"],
      reference: "Exodus 2" },

    { emojis: "📜🪨🔥⛰️", display: "The Ten Commandments",
      answers: ["The Ten Commandments", "Ten Commandments", "Moses on Mount Sinai", "Mount Sinai"],
      reference: "Exodus 20" },

    { emojis: "🦁👧⚔️", display: "Samson and the Lion",
      answers: ["Samson and the Lion", "Samson Kills a Lion", "Samson"],
      reference: "Judges 14:5-6" },

    { emojis: "👩‍🌾🌾💍", display: "Ruth and Boaz",
      answers: ["Ruth and Boaz", "Ruth & Boaz", "Ruth", "The Story of Ruth"],
      reference: "Ruth 2-4" },

    { emojis: "👦📿🛏️", display: "Samuel's Calling",
      answers: ["Samuel's Calling", "Samuels Calling", "God Calls Samuel", "Samuel"],
      reference: "1 Samuel 3" },

    { emojis: "🎵🪕👑", display: "David Plays for Saul",
      answers: ["David Plays for Saul", "David Plays the Harp for Saul", "David and Saul"],
      reference: "1 Samuel 16:23" },

    { emojis: "👬💔🏹", display: "David and Jonathan",
      answers: ["David and Jonathan", "David & Jonathan", "Jonathan"],
      reference: "1 Samuel 18-20" },

    { emojis: "👑😢🎶", display: "David Mourns Saul and Jonathan",
      answers: ["David Mourns Saul and Jonathan", "David's Lament", "Davids Lament"],
      reference: "2 Samuel 1" },

    { emojis: "🏠👀💌", display: "David and Bathsheba",
      answers: ["David and Bathsheba", "David & Bathsheba", "Bathsheba"],
      reference: "2 Samuel 11" },

    { emojis: "👑🧠⚖️👶", display: "Solomon's Judgment",
      answers: ["Solomon's Judgment", "Solomons Judgment", "The Wisdom of Solomon", "Solomon and the Baby"],
      reference: "1 Kings 3:16-28" },

    { emojis: "👸🏜️🎁", display: "The Queen of Sheba",
      answers: ["The Queen of Sheba", "Queen of Sheba"],
      reference: "1 Kings 10" },

    { emojis: "🏺🫙🛢️", display: "The Widow's Oil",
      answers: ["The Widow's Oil", "Widows Oil", "Elisha and the Widow's Oil", "Elijah and the Widow"],
      reference: "1 Kings 17:8-16; 2 Kings 4:1-7" },

    { emojis: "🔥🆚🐂", display: "Elijah and the Prophets of Baal",
      answers: ["Elijah and the Prophets of Baal", "Elijah on Mount Carmel", "Mount Carmel"],
      reference: "1 Kings 18" },

    { emojis: "🌪️🆙☁️", display: "Elijah Taken to Heaven",
      answers: ["Elijah Taken to Heaven", "Elijah's Chariot of Fire", "Elijahs Chariot of Fire", "Elijah"],
      reference: "2 Kings 2:11" },

    { emojis: "👦🪖🌊7️⃣", display: "Naaman Healed in the Jordan",
      answers: ["Naaman Healed in the Jordan", "Naaman and the Jordan River", "Naaman"],
      reference: "2 Kings 5" },

    { emojis: "👨‍👨‍👦🔥🚶", display: "Shadrach, Meshach, and Abednego",
      answers: ["Shadrach, Meshach, and Abednego", "The Fiery Furnace", "Fiery Furnace", "Three Men in the Furnace"],
      reference: "Daniel 3" },

    { emojis: "✋📝🧱", display: "Belshazzar's Feast",
      answers: ["Belshazzar's Feast", "Belshazzars Feast", "The Writing on the Wall", "Handwriting on the Wall"],
      reference: "Daniel 5" },

    { emojis: "👑🐂🌾", display: "Nebuchadnezzar's Dream",
      answers: ["Nebuchadnezzar's Dream", "Nebuchadnezzars Dream", "Daniel Interprets the Dream"],
      reference: "Daniel 2" },

    { emojis: "👸🕯️📯", display: "Esther Saves Her People",
      answers: ["Esther Saves Her People", "Esther", "The Story of Esther", "Queen Esther"],
      reference: "Esther 4-8" },

    { emojis: "🤕😢🤝", display: "The Suffering of Job",
      answers: ["The Suffering of Job", "Job's Suffering", "Jobs Suffering", "Job"],
      reference: "Job 1-2" },

    { emojis: "👶⭐🐫🐫🐫", display: "The Wise Men Visit Jesus",
      answers: ["The Wise Men Visit Jesus", "The Magi", "Wise Men Follow the Star", "Three Wise Men"],
      reference: "Matthew 2:1-12" },

    { emojis: "🕊️💧👳", display: "The Baptism of Jesus",
      answers: ["The Baptism of Jesus", "Jesus' Baptism", "Jesus Baptism", "John Baptizes Jesus"],
      reference: "Matthew 3:13-17" },

    { emojis: "😈🍞🏜️", display: "The Temptation of Jesus",
      answers: ["The Temptation of Jesus", "Jesus Tempted in the Wilderness", "Jesus Tempted by Satan"],
      reference: "Matthew 4:1-11" },

    { emojis: "✨🧔➡️👴", display: "The Transfiguration",
      answers: ["The Transfiguration", "Jesus' Transfiguration", "Jesus Transfiguration"],
      reference: "Matthew 17:1-8" },

    { emojis: "🛏️🚶‍♂️🙌", display: "Jesus Heals the Paralytic",
      answers: ["Jesus Heals the Paralytic", "Healing the Paralytic", "The Man Lowered Through the Roof"],
      reference: "Mark 2:1-12" },

    { emojis: "🌊🛑🤫", display: "Jesus Calms the Storm",
      answers: ["Jesus Calms the Storm", "Calming the Storm", "Jesus Calms the Sea"],
      reference: "Mark 4:35-41" },

    { emojis: "🚶‍♂️🌊👀", display: "Jesus Walks on Water",
      answers: ["Jesus Walks on Water", "Walking on Water", "Jesus and Peter Walk on Water"],
      reference: "Matthew 14:22-33" },

    { emojis: "🩸👗🙏", display: "The Woman with the Issue of Blood",
      answers: ["The Woman with the Issue of Blood", "Woman Touches Jesus' Garment", "Woman Touches Jesus Garment"],
      reference: "Mark 5:25-34" },

    { emojis: "👧💤🙌", display: "Jairus' Daughter",
      answers: ["Jairus' Daughter", "Jairus Daughter", "Jesus Raises Jairus' Daughter"],
      reference: "Mark 5:21-43" },

    { emojis: "👁️🙏👁️", display: "Jesus Heals a Blind Man",
      answers: ["Jesus Heals a Blind Man", "Healing the Blind Man", "Bartimaeus"],
      reference: "Mark 10:46-52" },

    { emojis: "🥖🐟4️⃣7️⃣", display: "Feeding the 4,000",
      answers: ["Feeding the 4000", "Feeding the 4,000", "Feeding of the Four Thousand"],
      reference: "Matthew 15:32-38" },

    { emojis: "🐴🌿👋", display: "The Triumphal Entry",
      answers: ["The Triumphal Entry", "Jesus Enters Jerusalem", "Palm Sunday"],
      reference: "Matthew 21:1-11" },

    { emojis: "🪙🪙🪙", display: "Judas Betrays Jesus",
      answers: ["Judas Betrays Jesus", "The Betrayal of Judas", "Thirty Pieces of Silver", "Judas"],
      reference: "Matthew 26:14-16" },

    { emojis: "🍞🍷🕊️", display: "The Last Supper",
      answers: ["The Last Supper", "Last Supper"],
      reference: "Matthew 26:26-29" },

    { emojis: "🌿😢🙏", display: "Jesus Prays in Gethsemane",
      answers: ["Jesus Prays in Gethsemane", "The Garden of Gethsemane", "Gethsemane"],
      reference: "Matthew 26:36-46" },

    { emojis: "🐓😭3️⃣", display: "Peter Denies Jesus",
      answers: ["Peter Denies Jesus", "Peter's Denial", "Peters Denial"],
      reference: "Matthew 26:69-75" },

    { emojis: "👑🩸✝️", display: "The Crucifixion",
      answers: ["The Crucifixion", "Jesus' Crucifixion", "Jesus Crucifixion"],
      reference: "Matthew 27:32-50" },

    { emojis: "👆🩹❓", display: "Doubting Thomas",
      answers: ["Doubting Thomas", "Thomas"],
      reference: "John 20:24-29" },

    { emojis: "🐟🛥️3️⃣🔥", display: "Jesus Appears by the Sea of Galilee",
      answers: ["Jesus Appears by the Sea of Galilee", "Breakfast on the Beach", "Jesus and the Catch of Fish"],
      reference: "John 21:1-14" },

    { emojis: "☁️🙌👋", display: "The Ascension",
      answers: ["The Ascension", "Jesus' Ascension", "Jesus Ascension", "Jesus Returns to Heaven"],
      reference: "Acts 1:9-11" },

    { emojis: "🔥💨🗣️", display: "The Day of Pentecost",
      answers: ["The Day of Pentecost", "Pentecost", "Tongues of Fire"],
      reference: "Acts 2" },

    { emojis: "⚡🐎🗣️", display: "Saul's Conversion",
      answers: ["Saul's Conversion", "Sauls Conversion", "The Road to Damascus", "Paul's Conversion", "Pauls Conversion"],
      reference: "Acts 9:1-9" },

    { emojis: "🌳🍎🙅", display: "Adam and Eve Hide from God",
      answers: ["Adam and Eve Hide from God", "Adam and Eve", "The Fall of Man"],
      reference: "Genesis 3:8-10" },

    { emojis: "🚣‍♂️🐦🌳", display: "Noah Sends Out the Dove",
      answers: ["Noah Sends Out the Dove", "The Dove and the Olive Branch", "Noah's Dove", "Noahs Dove"],
      reference: "Genesis 8:8-11" },

    { emojis: "🌈☁️✝️", display: "God's Covenant with Noah",
      answers: ["God's Covenant with Noah", "Gods Covenant with Noah", "The Rainbow Covenant", "Noah's Rainbow", "Noahs Rainbow"],
      reference: "Genesis 9:12-17" },

    { emojis: "🐫🤵💍", display: "Isaac and Rebekah",
      answers: ["Isaac and Rebekah", "Isaac & Rebekah", "Isaac's Wife", "Isaacs Wife"],
      reference: "Genesis 24" },

    { emojis: "🤼‍♂️🌙🦵", display: "Jacob Wrestles with the Angel",
      answers: ["Jacob Wrestles with the Angel", "Jacob Wrestles God", "Jacob's Wrestling Match", "Jacobs Wrestling Match"],
      reference: "Genesis 32:24-30" },

    { emojis: "👑🍞🇪🇬", display: "Joseph Reunites with His Brothers",
      answers: ["Joseph Reunites with His Brothers", "Joseph Reveals Himself", "Joseph and His Brothers"],
      reference: "Genesis 45" }
  ]
};
