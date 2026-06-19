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
      reference: "Matthew 17:24-27" }
  ]
};
