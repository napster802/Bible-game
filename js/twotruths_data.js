/* ============================================================
   Bible Challenge Arena - Two Truths and a Lie Data
   Each round is 2 true facts + 1 false fact about the same Bible
   subject. lieIndex marks which statement is false; players tap
   the statement they think is the lie.
   ============================================================ */
const TwoTruthsData = {
  ROUNDS: [
    { subject: "Noah", statements: [
      "Noah's ark was 300 cubits long",
      "Noah had three sons: Shem, Ham, and Japheth",
      "Noah's ark had four decks"
    ], lieIndex: 2, reference: "Genesis 6:10,15-16" },

    { subject: "Moses", statements: [
      "Moses led the Israelites through the Red Sea",
      "Moses received the Ten Commandments on Mount Sinai",
      "Moses crossed the Jordan River into Canaan"
    ], lieIndex: 2, reference: "Exodus 14:21-22; 20:1-17; Deuteronomy 34:4-5" },

    { subject: "David", statements: [
      "David killed Goliath with a sling and a stone",
      "David was a shepherd before becoming king",
      "David built the first Temple in Jerusalem"
    ], lieIndex: 2, reference: "1 Samuel 16:11; 17:50; 1 Kings 6:1" },

    { subject: "Solomon", statements: [
      "Solomon was known for his great wisdom",
      "Solomon built the first Temple in Jerusalem",
      "Solomon led the Israelites out of Egypt"
    ], lieIndex: 2, reference: "1 Kings 3:12; 6:1; Exodus 3:10" },

    { subject: "Samson", statements: [
      "Samson's strength came from his uncut hair",
      "Samson was betrayed by Delilah",
      "Samson defeated 1,000 Philistines with a sword"
    ], lieIndex: 2, reference: "Judges 15:15-16; 16:17-19" },

    { subject: "Jonah", statements: [
      "Jonah was swallowed by a great fish",
      "Jonah was sent to preach to Nineveh",
      "Jonah willingly obeyed God's first command"
    ], lieIndex: 2, reference: "Jonah 1:2-3,17" },

    { subject: "Daniel", statements: [
      "Daniel was thrown into a den of lions",
      "Daniel interpreted King Nebuchadnezzar's dreams",
      "Daniel was thrown into a fiery furnace"
    ], lieIndex: 2, reference: "Daniel 2:24-28; 3:19-23; 6:16" },

    { subject: "Esther", statements: [
      "Esther became queen of Persia",
      "Esther risked her life to save the Jewish people",
      "Esther was Daniel's wife"
    ], lieIndex: 2, reference: "Esther 2:17; 4:16" },

    { subject: "Ruth", statements: [
      "Ruth was a Moabite woman",
      "Ruth married Boaz",
      "Ruth was the mother of Samuel"
    ], lieIndex: 2, reference: "Ruth 1:4; 4:13; 1 Samuel 1:20" },

    { subject: "Joseph (son of Jacob)", statements: [
      "Joseph was sold into slavery by his brothers",
      "Joseph became a ruler in Egypt",
      "Joseph was the firstborn son of Jacob"
    ], lieIndex: 2, reference: "Genesis 35:23; 37:28; 41:41" },

    { subject: "Abraham", statements: [
      "Abraham was originally named Abram",
      "Abraham was asked to sacrifice his son Isaac",
      "Abraham was the father of the twelve tribes of Israel"
    ], lieIndex: 2, reference: "Genesis 17:5; 22:2; 35:22-26" },

    { subject: "Jacob", statements: [
      "Jacob wrestled with an angel",
      "Jacob's name was changed to Israel",
      "Jacob was Isaac's older twin brother"
    ], lieIndex: 2, reference: "Genesis 25:25-26; 32:24-28" },

    { subject: "Elijah", statements: [
      "Elijah was taken to heaven in a whirlwind",
      "Elijah challenged the prophets of Baal",
      "Elijah was swallowed by a great fish"
    ], lieIndex: 2, reference: "1 Kings 18:19-40; 2 Kings 2:11; Jonah 1:17" },

    { subject: "Peter", statements: [
      "Peter denied knowing Jesus three times",
      "Peter was a fisherman before following Jesus",
      "Peter betrayed Jesus for thirty pieces of silver"
    ], lieIndex: 2, reference: "Matthew 4:18; 26:15,34" },

    { subject: "Paul the Apostle", statements: [
      "Paul was originally named Saul",
      "Paul was blinded on the road to Damascus",
      "Paul was one of Jesus' twelve original disciples"
    ], lieIndex: 2, reference: "Acts 9:3-9; 13:9" },

    { subject: "John the Baptist", statements: [
      "John the Baptist baptized Jesus",
      "John the Baptist ate locusts and wild honey",
      "John the Baptist was one of the twelve apostles"
    ], lieIndex: 2, reference: "Matthew 3:4,13" },

    { subject: "Mary, the mother of Jesus", statements: [
      "Mary was visited by the angel Gabriel",
      "Mary was engaged to Joseph when she became pregnant",
      "Mary traveled to Egypt while pregnant with Jesus"
    ], lieIndex: 2, reference: "Luke 1:26-31; Matthew 1:18; 2:13-14" },

    { subject: "Joshua", statements: [
      "Joshua led the Israelites into the Promised Land",
      "The walls of Jericho fell during Joshua's conquest",
      "Joshua parted the Red Sea"
    ], lieIndex: 2, reference: "Joshua 1:1-2; 6:20; Exodus 14:21" },

    { subject: "Gideon", statements: [
      "Gideon defeated the Midianites with just 300 men",
      "Gideon asked God for a sign using a fleece",
      "Gideon was Israel's first king"
    ], lieIndex: 2, reference: "Judges 6:36-38; 7:7; 1 Samuel 10:1" },

    { subject: "Job", statements: [
      "Job lost his wealth, health, and family in a trial of faith",
      "God restored Job's fortunes after his suffering",
      "Job was a king of Israel"
    ], lieIndex: 2, reference: "Job 1-2; 42:10" },

    { subject: "Adam and Eve", statements: [
      "Adam and Eve were placed in the Garden of Eden",
      "Eve was created from one of Adam's ribs",
      "Adam and Eve's first son was named Seth"
    ], lieIndex: 2, reference: "Genesis 2:8,21-22; 4:1" },

    { subject: "Cain and Abel", statements: [
      "Cain killed his brother Abel",
      "Abel was a keeper of sheep",
      "Cain was a shepherd and Abel was a farmer"
    ], lieIndex: 2, reference: "Genesis 4:2,8" },

    { subject: "The Plagues of Egypt", statements: [
      "The Nile turning to blood was one of the plagues",
      "There were ten plagues on Egypt",
      "A plague of locusts was the final plague"
    ], lieIndex: 2, reference: "Exodus 7:20; 10:12-15; 11:1-5" },

    { subject: "The Twelve Apostles", statements: [
      "Judas Iscariot was one of the twelve apostles",
      "Peter and Andrew were brothers among the apostles",
      "There were thirteen apostles chosen by Jesus"
    ], lieIndex: 2, reference: "Matthew 4:18; 10:1-4" }
  ]
};
