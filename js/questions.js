const QUESTION_DB = {
  easy: [
    {
      question: "Who built the ark?",
      choices: ["Moses", "Noah", "Abraham", "David"],
      answer: "Noah",
      reference: "Genesis 6:14",
      category: "Old Testament"
    },
    {
      question: "Who was the first man?",
      choices: ["Adam", "Cain", "Abel", "Seth"],
      answer: "Adam",
      reference: "Genesis 2:7",
      category: "Old Testament"
    },
    {
      question: "Who was the first woman?",
      choices: ["Sarah", "Rebekah", "Eve", "Miriam"],
      answer: "Eve",
      reference: "Genesis 3:20",
      category: "Old Testament"
    },
    {
      question: "Who led Israel out of Egypt?",
      choices: ["Joshua", "Aaron", "Abraham", "Moses"],
      answer: "Moses",
      reference: "Exodus 3:10",
      category: "Old Testament"
    },
    {
      question: "Who killed Goliath?",
      choices: ["Saul", "Jonathan", "Solomon", "David"],
      answer: "David",
      reference: "1 Samuel 17:50",
      category: "Old Testament"
    },
    {
      question: "Who was swallowed by a big fish?",
      choices: ["Elijah", "Jonah", "Elisha", "Isaiah"],
      answer: "Jonah",
      reference: "Jonah 1:17",
      category: "Prophets"
    },
    {
      question: "Who baptized Jesus?",
      choices: ["Peter", "Paul", "James", "John the Baptist"],
      answer: "John the Baptist",
      reference: "Matthew 3:13",
      category: "New Testament"
    },
    {
      question: "Where was Jesus born?",
      choices: ["Nazareth", "Bethlehem", "Jerusalem", "Jericho"],
      answer: "Bethlehem",
      reference: "Luke 2:4-7",
      category: "New Testament"
    },
    {
      question: "How many disciples did Jesus have?",
      choices: ["10", "11", "13", "12"],
      answer: "12",
      reference: "Matthew 10:1",
      category: "New Testament"
    },
    {
      question: "Who betrayed Jesus?",
      choices: ["Judas", "Peter", "Thomas", "James"],
      answer: "Judas",
      reference: "Matthew 26:47",
      category: "New Testament"
    },
    {
      question: "Who was Jesus' mother?",
      choices: ["Elizabeth", "Martha", "Mary", "Salome"],
      answer: "Mary",
      reference: "Luke 1:30",
      category: "New Testament"
    },
    {
      question: "What was the first book of the Bible?",
      choices: ["Exodus", "Genesis", "Psalms", "Matthew"],
      answer: "Genesis",
      reference: "Genesis 1:1",
      category: "Old Testament"
    },
    {
      question: "What was the last book of the Bible?",
      choices: ["Jude", "Hebrews", "Revelation", "John"],
      answer: "Revelation",
      reference: "Revelation 22:21",
      category: "New Testament"
    },
    {
      question: "Who received the Ten Commandments?",
      choices: ["Abraham", "Aaron", "Joshua", "Moses"],
      answer: "Moses",
      reference: "Exodus 20:1",
      category: "Old Testament"
    },
    {
      question: "What sea did Moses part?",
      choices: ["Dead Sea", "Red Sea", "Mediterranean Sea", "Sea of Galilee"],
      answer: "Red Sea",
      reference: "Exodus 14:21",
      category: "Old Testament"
    },
    {
      question: "Who built the temple in Jerusalem?",
      choices: ["David", "Rehoboam", "Hezekiah", "Solomon"],
      answer: "Solomon",
      reference: "1 Kings 6:1",
      category: "Old Testament"
    },
    {
      question: "What was Abraham's son's name?",
      choices: ["Jacob", "Isaac", "Ishmael", "Esau"],
      answer: "Isaac",
      reference: "Genesis 21:3",
      category: "Old Testament"
    },
    {
      question: "Who interpreted Pharaoh's dreams?",
      choices: ["Moses", "Joseph", "Daniel", "Elijah"],
      answer: "Joseph",
      reference: "Genesis 41:25",
      category: "Old Testament"
    },
    {
      question: "Who was thrown into the lion's den?",
      choices: ["Shadrach", "Ezekiel", "Daniel", "Isaiah"],
      answer: "Daniel",
      reference: "Daniel 6:16",
      category: "Prophets"
    },
    {
      question: "Who was the strongest man in the Bible?",
      choices: ["David", "Goliath", "Solomon", "Samson"],
      answer: "Samson",
      reference: "Judges 16:17",
      category: "Old Testament"
    },
    {
      question: "How many days did God take to create the world?",
      choices: ["5", "7", "8", "6"],
      answer: "6",
      reference: "Genesis 1",
      category: "Old Testament"
    },
    {
      question: "On what day did God rest?",
      choices: ["6th", "8th", "5th", "7th"],
      answer: "7th",
      reference: "Genesis 2:2",
      category: "Old Testament"
    },
    {
      question: "What did Adam and Eve eat in the Garden?",
      choices: ["An apple", "Grapes", "Forbidden fruit", "Bread"],
      answer: "Forbidden fruit",
      reference: "Genesis 3:6",
      category: "Old Testament"
    },
    {
      question: "What city did Joshua conquer first in Canaan?",
      choices: ["Jerusalem", "Ai", "Bethel", "Jericho"],
      answer: "Jericho",
      reference: "Joshua 6:20",
      category: "Old Testament"
    },
    {
      question: "Who was Ruth's mother-in-law?",
      choices: ["Rahab", "Naomi", "Deborah", "Miriam"],
      answer: "Naomi",
      reference: "Ruth 1:16",
      category: "Old Testament"
    },
    {
      question: "Who climbed a tree to see Jesus?",
      choices: ["Matthew", "Thomas", "Zacchaeus", "Andrew"],
      answer: "Zacchaeus",
      reference: "Luke 19:4",
      category: "New Testament"
    },
    {
      question: "Who denied Jesus three times?",
      choices: ["James", "John", "Peter", "Thomas"],
      answer: "Peter",
      reference: "Matthew 26:75",
      category: "New Testament"
    },
    {
      question: "What animal spoke to Balaam?",
      choices: ["Horse", "Ox", "Donkey", "Camel"],
      answer: "Donkey",
      reference: "Numbers 22:28",
      category: "Old Testament"
    },
    {
      question: "Who wrote many of the Psalms?",
      choices: ["Solomon", "David", "Moses", "Asaph"],
      answer: "David",
      reference: "Psalms",
      category: "Old Testament"
    },
    {
      question: "What was Jesus' earthly profession?",
      choices: ["Fisherman", "Farmer", "Carpenter", "Shepherd"],
      answer: "Carpenter",
      reference: "Mark 6:3",
      category: "New Testament"
    },
    {
      question: "Who walked on water with Jesus?",
      choices: ["Andrew", "Peter", "John", "James"],
      answer: "Peter",
      reference: "Matthew 14:29",
      category: "New Testament"
    },
    {
      question: "What was Jesus' first miracle?",
      choices: ["Healing a leper", "Feeding 5000", "Raising Lazarus", "Water into wine"],
      answer: "Water into wine",
      reference: "John 2:9",
      category: "New Testament"
    },
    {
      question: "What garden did Jesus pray in before His arrest?",
      choices: ["Garden of Eden", "Vineyard", "Gethsemane", "Garden of Joseph"],
      answer: "Gethsemane",
      reference: "Matthew 26:36",
      category: "New Testament"
    },
    {
      question: "What bird returned to Noah with an olive leaf?",
      choices: ["Raven", "Sparrow", "Eagle", "Dove"],
      answer: "Dove",
      reference: "Genesis 8:11",
      category: "Old Testament"
    },
    {
      question: "Who was Isaac's wife?",
      choices: ["Rachel", "Leah", "Zipporah", "Rebekah"],
      answer: "Rebekah",
      reference: "Genesis 24:67",
      category: "Old Testament"
    },
    {
      question: "Who was Jacob's twin brother?",
      choices: ["Ishmael", "Laban", "Esau", "Reuben"],
      answer: "Esau",
      reference: "Genesis 25:26",
      category: "Old Testament"
    },
    {
      question: "Who had a coat of many colors?",
      choices: ["Jacob", "Moses", "Joseph", "David"],
      answer: "Joseph",
      reference: "Genesis 37:3",
      category: "Old Testament"
    },
    {
      question: "What giant did David defeat?",
      choices: ["Og", "Goliath", "Samson", "Nimrod"],
      answer: "Goliath",
      reference: "1 Samuel 17:50",
      category: "Old Testament"
    },
    {
      question: "Who was the wisest king in the Bible?",
      choices: ["David", "Hezekiah", "Solomon", "Josiah"],
      answer: "Solomon",
      reference: "1 Kings 4:29",
      category: "Old Testament"
    },
    {
      question: "What city was Jesus raised in?",
      choices: ["Bethlehem", "Capernaum", "Jerusalem", "Nazareth"],
      answer: "Nazareth",
      reference: "Matthew 2:23",
      category: "New Testament"
    },
    {
      question: "Who was the first king of Israel?",
      choices: ["David", "Samuel", "Saul", "Solomon"],
      answer: "Saul",
      reference: "1 Samuel 10:1",
      category: "Old Testament"
    },
    {
      question: "Who anointed David as king?",
      choices: ["Nathan", "Eli", "Elijah", "Samuel"],
      answer: "Samuel",
      reference: "1 Samuel 16:13",
      category: "Old Testament"
    },
    {
      question: "What river was Jesus baptized in?",
      choices: ["Nile", "Euphrates", "Tigris", "Jordan River"],
      answer: "Jordan River",
      reference: "Matthew 3:13",
      category: "New Testament"
    },
    {
      question: "Who watched over baby Moses in the river?",
      choices: ["Jochebed", "Zipporah", "Rahab", "Miriam"],
      answer: "Miriam",
      reference: "Exodus 2:4",
      category: "Old Testament"
    },
    {
      question: "Who was Esther married to?",
      choices: ["Mordecai", "Haman", "Cyrus", "King Xerxes"],
      answer: "King Xerxes",
      reference: "Esther 2:17",
      category: "Old Testament"
    },
    {
      question: "What was Jesus laid in after His birth?",
      choices: ["Cradle", "Basket", "Crib", "Manger"],
      answer: "Manger",
      reference: "Luke 2:7",
      category: "New Testament"
    },
    {
      question: "How many books are in the Bible?",
      choices: ["60", "64", "72", "66"],
      answer: "66",
      reference: "Bible",
      category: "General"
    },
    {
      question: "What animal tempted Eve in the Garden?",
      choices: ["Lion", "Eagle", "Serpent", "Fox"],
      answer: "Serpent",
      reference: "Genesis 3:1",
      category: "Old Testament"
    },
    {
      question: "Who wrote the book of Revelation?",
      choices: ["Paul", "Peter", "John", "James"],
      answer: "John",
      reference: "Revelation 1:1",
      category: "New Testament"
    },
    {
      question: "What is the shortest verse in the Bible?",
      choices: ["John 3:16", "Psalm 23:1", "Romans 8:28", "John 11:35"],
      answer: "John 11:35",
      reference: "John 11:35",
      category: "New Testament"
    },
    { question: "How many days did Jesus fast in the wilderness?", choices: ["20", "30", "40", "50"], answer: "40", reference: "Matthew 4:2", category: "Gospels" },
    { question: "What animal did Balaam ride?", choices: ["Horse", "Donkey", "Camel", "Ox"], answer: "Donkey", reference: "Numbers 22:21", category: "Old Testament" },
    { question: "Who was the mother of Jesus?", choices: ["Martha", "Elizabeth", "Mary", "Salome"], answer: "Mary", reference: "Luke 1:30-31", category: "Gospels" },
    { question: "What did God create on the first day?", choices: ["Sky", "Sea", "Light", "Land"], answer: "Light", reference: "Genesis 1:3", category: "Old Testament" },
    { question: "How many disciples did Jesus have?", choices: ["10", "12", "7", "14"], answer: "12", reference: "Matthew 10:1", category: "Gospels" },
    { question: "Who denied Jesus three times?", choices: ["John", "James", "Thomas", "Peter"], answer: "Peter", reference: "Matthew 26:75", category: "Gospels" },
    { question: "What is the first book of the New Testament?", choices: ["Mark", "Luke", "Matthew", "John"], answer: "Matthew", reference: "Matthew 1:1", category: "New Testament" },
    { question: "Where was Jesus born?", choices: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], answer: "Bethlehem", reference: "Luke 2:4", category: "Gospels" },
    { question: "What river was Jesus baptized in?", choices: ["Nile", "Jordan", "Euphrates", "Tigris"], answer: "Jordan", reference: "Matthew 3:13", category: "Gospels" },
    { question: "Who wrote most of the New Testament letters?", choices: ["Peter", "John", "Paul", "James"], answer: "Paul", reference: "Romans 1:1", category: "Epistles" },
    { question: "What did Jesus turn water into?", choices: ["Milk", "Oil", "Blood", "Wine"], answer: "Wine", reference: "John 2:9", category: "Gospels" },
    { question: "How many books are in the Bible?", choices: ["60", "66", "73", "72"], answer: "66", reference: "General", category: "New Testament" },
    { question: "Who built the Temple in Jerusalem?", choices: ["David", "Moses", "Abraham", "Solomon"], answer: "Solomon", reference: "1 Kings 6:1", category: "Old Testament" },
    { question: "What did God use to destroy the world in Noah's time?", choices: ["Fire", "Flood", "Earthquake", "Plague"], answer: "Flood", reference: "Genesis 7:17", category: "Old Testament" },
    { question: "How many stones did David take to fight Goliath?", choices: ["1", "3", "5", "7"], answer: "5", reference: "1 Samuel 17:40", category: "Old Testament" },
    { question: "Who was the wisest king of Israel?", choices: ["David", "Saul", "Solomon", "Josiah"], answer: "Solomon", reference: "1 Kings 4:30", category: "Old Testament" },
    { question: "What animal tempted Eve in the Garden of Eden?", choices: ["Dove", "Raven", "Serpent", "Lion"], answer: "Serpent", reference: "Genesis 3:1", category: "Old Testament" },
    { question: "On which day did God rest after creation?", choices: ["Fifth", "Sixth", "Seventh", "Eighth"], answer: "Seventh", reference: "Genesis 2:2", category: "Old Testament" },
    { question: "What was the name of Abraham's wife?", choices: ["Rachel", "Rebekah", "Sarah", "Leah"], answer: "Sarah", reference: "Genesis 17:15", category: "Old Testament" },
    { question: "How many plagues did God send on Egypt?", choices: ["7", "8", "10", "12"], answer: "10", reference: "Exodus 7-12", category: "Old Testament" },
    { question: "Who was thrown into the lions' den?", choices: ["Elijah", "Ezekiel", "Daniel", "Isaiah"], answer: "Daniel", reference: "Daniel 6:16", category: "Old Testament" },
    { question: "What is the last book of the Bible?", choices: ["Jude", "Hebrews", "2 Peter", "Revelation"], answer: "Revelation", reference: "Revelation 1:1", category: "New Testament" },
    { question: "Who was the first king of Israel?", choices: ["David", "Solomon", "Saul", "Samuel"], answer: "Saul", reference: "1 Samuel 10:24", category: "Old Testament" },
    { question: "Who ran away from God and ended up in a fish?", choices: ["Jonah", "Elijah", "Micah", "Amos"], answer: "Jonah", reference: "Jonah 1:3", category: "Prophets" },
    { question: "What is the longest book in the Bible?", choices: ["Genesis", "Psalms", "Isaiah", "Job"], answer: "Psalms", reference: "Psalms", category: "Psalms" },
    { question: "Who wrote the book of Psalms mostly?", choices: ["Solomon", "Moses", "David", "Asaph"], answer: "David", reference: "Psalms 3:1", category: "Psalms" },
    { question: "What was Samson's source of strength?", choices: ["His spear", "His hair", "His shield", "His cloak"], answer: "His hair", reference: "Judges 16:17", category: "Old Testament" },
    { question: "How many brothers did Joseph have?", choices: ["10", "11", "12", "9"], answer: "11", reference: "Genesis 42:13", category: "Old Testament" },
    { question: "Who was the father of John the Baptist?", choices: ["Joseph", "Zacharias", "Simeon", "Eli"], answer: "Zacharias", reference: "Luke 1:13", category: "Gospels" },
    { question: "What did Judas betray Jesus for?", choices: ["30 pieces of silver", "50 gold coins", "A field", "Freedom"], answer: "30 pieces of silver", reference: "Matthew 26:15", category: "Gospels" },
    { question: "Who was the first apostle called by Jesus?", choices: ["John", "James", "Andrew", "Peter"], answer: "Peter", reference: "Matthew 4:18", category: "Gospels" },
    { question: "What is the last book of the Old Testament?", choices: ["Zechariah", "Zephaniah", "Malachi", "Haggai"], answer: "Malachi", reference: "Malachi 1:1", category: "Old Testament" },
    { question: "Who was raised from the dead by Jesus in Bethany?", choices: ["Jairus", "Simon", "Lazarus", "Zacchaeus"], answer: "Lazarus", reference: "John 11:43", category: "Gospels" },
    { question: "What mountain did Moses receive the Ten Commandments on?", choices: ["Mount Zion", "Mount Carmel", "Mount Sinai", "Mount Moriah"], answer: "Mount Sinai", reference: "Exodus 19:20", category: "Old Testament" },
    { question: "How many people were in Noah's family saved on the ark?", choices: ["4", "6", "8", "10"], answer: "8", reference: "1 Peter 3:20", category: "Old Testament" },
    { question: "What was Paul's name before he became a Christian?", choices: ["Silas", "Saul", "Barnabas", "Titus"], answer: "Saul", reference: "Acts 7:58", category: "New Testament" },
    { question: "Who interpreted Pharaoh's dreams?", choices: ["Moses", "Aaron", "Joseph", "Joshua"], answer: "Joseph", reference: "Genesis 41:15", category: "Old Testament" },
    { question: "What was the forbidden fruit Adam and Eve ate?", choices: ["Apple", "Fig", "Fruit of the tree of knowledge", "Grape"], answer: "Fruit of the tree of knowledge", reference: "Genesis 2:17", category: "Old Testament" },
    { question: "Who walked on water with Jesus?", choices: ["John", "James", "Andrew", "Peter"], answer: "Peter", reference: "Matthew 14:29", category: "Gospels" },
    { question: "What was written over the cross of Jesus?", choices: ["King of Jews", "Son of God", "Savior of Israel", "Jesus of Nazareth King of the Jews"], answer: "Jesus of Nazareth King of the Jews", reference: "John 19:19", category: "Gospels" },
    { question: "How many days was Jonah in the fish?", choices: ["1", "2", "3", "7"], answer: "3", reference: "Jonah 1:17", category: "Prophets" },
    { question: "Who was the first Christian martyr?", choices: ["Paul", "Stephen", "James", "Peter"], answer: "Stephen", reference: "Acts 7:59", category: "New Testament" },
    { question: "What is the first commandment?", choices: ["Do not kill", "You shall have no other gods", "Keep the Sabbath", "Honor your parents"], answer: "You shall have no other gods", reference: "Exodus 20:3", category: "Old Testament" },
    { question: "Who was Jacob's father?", choices: ["Abraham", "Isaac", "Laban", "Esau"], answer: "Isaac", reference: "Genesis 25:26", category: "Old Testament" },
    { question: "What did the angel tell Mary?", choices: ["She would be queen", "She would bear God's Son", "She should go to Egypt", "She should marry Joseph"], answer: "She would bear God's Son", reference: "Luke 1:31", category: "Gospels" },
    { question: "Who helped Moses hold his arms up in battle?", choices: ["Joshua and Caleb", "Aaron and Hur", "Aaron and Joshua", "Miriam and Aaron"], answer: "Aaron and Hur", reference: "Exodus 17:12", category: "Old Testament" },
    { question: "What feast did Jesus celebrate before his arrest?", choices: ["Feast of Tabernacles", "Feast of Weeks", "Passover", "Purim"], answer: "Passover", reference: "Matthew 26:18", category: "Gospels" },
    { question: "Who was Joseph's mother?", choices: ["Leah", "Rachel", "Zilpah", "Bilhah"], answer: "Rachel", reference: "Genesis 30:22-24", category: "Old Testament" },
    { question: "What does the name 'Jesus' mean?", choices: ["Savior", "King", "Servant", "Lord"], answer: "Savior", reference: "Matthew 1:21", category: "Gospels" },
    { question: "Who was the first person to see Jesus after His resurrection?", choices: ["Peter", "Mary Magdalene", "John", "Joanna"], answer: "Mary Magdalene", reference: "John 20:14-16", category: "Gospels" },
    { question: "Which sea did Moses part?", choices: ["Dead Sea", "Sea of Galilee", "Red Sea", "Mediterranean"], answer: "Red Sea", reference: "Exodus 14:21", category: "Old Testament" },
    { question: "Who was swallowed by a whale according to Jonah's story?", choices: ["Elijah", "Jonah", "Nahum", "Micah"], answer: "Jonah", reference: "Jonah 1:17", category: "Prophets" },
    { question: "What did the Holy Spirit look like when it descended on Jesus?", choices: ["A lamb", "A dove", "A flame", "A cloud"], answer: "A dove", reference: "Matthew 3:16", category: "Gospels" },
    { question: "How many gates does the New Jerusalem have?", choices: ["6", "8", "12", "24"], answer: "12", reference: "Revelation 21:12", category: "New Testament" },
    { question: "Who was the son of Abraham and Sarah?", choices: ["Ishmael", "Esau", "Jacob", "Isaac"], answer: "Isaac", reference: "Genesis 21:3", category: "Old Testament" },
    { question: "What did Ruth say to Naomi?", choices: ["I will stay with you wherever you go", "Where you go I will go", "Do not leave me behind", "Lead me to your people"], answer: "Where you go I will go", reference: "Ruth 1:16", category: "Old Testament" },
    { question: "Who was called the 'doubting' disciple?", choices: ["Philip", "Andrew", "Bartholomew", "Thomas"], answer: "Thomas", reference: "John 20:25", category: "Gospels" },
    { question: "In the Beatitudes, who does Jesus say will inherit the earth?", choices: ["The pure in heart", "The poor in spirit", "The meek", "The peacemakers"], answer: "The meek", reference: "Matthew 5:5", category: "Gospels" },
    { question: "Who was thrown into a furnace by Nebuchadnezzar?", choices: ["Daniel and Ezekiel", "Shadrach Meshach and Abednego", "Elijah and Elisha", "Isaiah and Jeremiah"], answer: "Shadrach Meshach and Abednego", reference: "Daniel 3:20", category: "Old Testament" },
    { question: "What city's walls fell when the Israelites marched around it?", choices: ["Ai", "Gibeon", "Jericho", "Megiddo"], answer: "Jericho", reference: "Joshua 6:20", category: "Old Testament" },
    { question: "Who was the tax collector Jesus called to follow Him?", choices: ["Simon", "Bartholomew", "Matthew", "Philip"], answer: "Matthew", reference: "Matthew 9:9", category: "Gospels" },
    { question: "What did God promise Abraham his descendants would be as numerous as?", choices: ["Trees of the forest", "Stars of heaven", "Grains of sand only", "Stars and sand"], answer: "Stars and sand", reference: "Genesis 22:17", category: "Old Testament" },
    { question: "Who is described as the friend of God?", choices: ["Moses", "David", "Noah", "Abraham"], answer: "Abraham", reference: "James 2:23", category: "Old Testament" },
    { question: "What weapon did Goliath carry?", choices: ["Bow and arrow", "Spear and shield", "Sword only", "Axe"], answer: "Spear and shield", reference: "1 Samuel 17:7", category: "Old Testament" },
    { question: "What did the prodigal son ask his father for?", choices: ["His blessing", "His inheritance", "Food and shelter", "Forgiveness"], answer: "His inheritance", reference: "Luke 15:12", category: "Gospels" },
    { question: "Who was the mother of Isaac?", choices: ["Rebekah", "Hagar", "Sarah", "Rachel"], answer: "Sarah", reference: "Genesis 21:3", category: "Old Testament" },
    { question: "What did God give Moses on Mount Sinai?", choices: ["A vision", "A burning bush", "Ten Commandments", "The Ark of the Covenant"], answer: "Ten Commandments", reference: "Exodus 31:18", category: "Old Testament" },
    { question: "Who was the beloved disciple mentioned in the Gospel of John?", choices: ["James", "Peter", "Andrew", "John"], answer: "John", reference: "John 21:20", category: "Gospels" },
    { question: "What is the Golden Rule according to Jesus?", choices: ["Love God above all", "Do unto others as you would have them do to you", "Honor your parents", "Pray without ceasing"], answer: "Do unto others as you would have them do to you", reference: "Matthew 7:12", category: "Gospels" },
    { question: "How did Elijah go to heaven?", choices: ["He was carried by angels", "He died and was raised", "He was taken up in a whirlwind", "He walked into the clouds"], answer: "He was taken up in a whirlwind", reference: "2 Kings 2:11", category: "Prophets" },
    { question: "Who gave the Sermon on the Mount?", choices: ["Peter", "Moses", "Paul", "Jesus"], answer: "Jesus", reference: "Matthew 5:1-2", category: "Gospels" },
    { question: "How many loaves of bread did Jesus use to feed 5000?", choices: ["2", "5", "7", "12"], answer: "5", reference: "John 6:9", category: "Gospels" },
    { question: "Who was the brother of Martha and Mary?", choices: ["Simon", "Lazarus", "Andrew", "Philip"], answer: "Lazarus", reference: "John 11:2", category: "Gospels" },
    { question: "What color of robe was put on Jesus to mock Him?", choices: ["White", "Blue", "Scarlet", "Gold"], answer: "Scarlet", reference: "Matthew 27:28", category: "Gospels" },
    { question: "Who baptized the Ethiopian eunuch?", choices: ["Paul", "Philip", "Peter", "Barnabas"], answer: "Philip", reference: "Acts 8:38", category: "New Testament" },
    { question: "What was the name of the garden where Jesus was arrested?", choices: ["Garden of Eden", "Garden of Gethsemane", "Garden of Joseph", "Garden of Bethany"], answer: "Garden of Gethsemane", reference: "Matthew 26:36", category: "Gospels" },
    { question: "Who was Isaac's wife?", choices: ["Rachel", "Leah", "Sarah", "Rebekah"], answer: "Rebekah", reference: "Genesis 24:67", category: "Old Testament" },
    { question: "What did Moses see burning but not being consumed?", choices: ["A pillar", "The Tabernacle", "A bush", "The altar"], answer: "A bush", reference: "Exodus 3:2", category: "Old Testament" },
    { question: "Who wrote the book of Revelation?", choices: ["Paul", "Peter", "James", "John"], answer: "John", reference: "Revelation 1:1", category: "New Testament" },
    { question: "What was the name of the field bought with Judas's betrayal money?", choices: ["Field of Blood", "Potter's Field", "Both are correct", "Field of Tears"], answer: "Both are correct", reference: "Matthew 27:7-8", category: "Gospels" },
    { question: "Who was the first person God spoke to after Adam?", choices: ["Abel", "Cain", "Seth", "Eve"], answer: "Eve", reference: "Genesis 3:13", category: "Old Testament" },
    { question: "What miracle happened at Pentecost?", choices: ["Jesus appeared to the disciples", "The Holy Spirit came on the believers", "Lazarus was raised", "Peter walked on water"], answer: "The Holy Spirit came on the believers", reference: "Acts 2:1-4", category: "New Testament" },
    { question: "How many fish were in the miraculous catch that tore Peter's net?", choices: ["100", "138", "153", "200"], answer: "153", reference: "John 21:11", category: "Gospels" },
    { question: "Who was Esther's cousin who raised her?", choices: ["Haman", "Mordecai", "Ahasuerus", "Hegai"], answer: "Mordecai", reference: "Esther 2:7", category: "Old Testament" },
    { question: "What did the wise men bring to baby Jesus?", choices: ["Silver and cloth", "Gold frankincense and myrrh", "Food and water", "Oil and incense"], answer: "Gold frankincense and myrrh", reference: "Matthew 2:11", category: "Gospels" },
    { question: "Who was the father of the twelve tribes of Israel?", choices: ["Abraham", "Isaac", "Joseph", "Jacob"], answer: "Jacob", reference: "Genesis 35:22", category: "Old Testament" },
    { question: "On what mountain did Elijah defeat the prophets of Baal?", choices: ["Mount Sinai", "Mount Zion", "Mount Carmel", "Mount Moriah"], answer: "Mount Carmel", reference: "1 Kings 18:19", category: "Prophets" },
    { question: "What language did Jesus primarily speak?", choices: ["Hebrew", "Greek", "Aramaic", "Latin"], answer: "Aramaic", reference: "Mark 5:41", category: "Gospels" }
  ],

  medium: [
    {
      question: "How old was Noah when the flood came?",
      choices: ["500", "700", "600", "800"],
      answer: "600",
      reference: "Genesis 7:6",
      category: "Old Testament"
    },
    {
      question: "How many spies did Moses send to explore Canaan?",
      choices: ["10", "11", "13", "12"],
      answer: "12",
      reference: "Numbers 13:1",
      category: "Old Testament"
    },
    {
      question: "Who replaced Judas as an apostle?",
      choices: ["Barnabas", "Paul", "Matthias", "Mark"],
      answer: "Matthias",
      reference: "Acts 1:26",
      category: "New Testament"
    },
    {
      question: "What was Paul's original name?",
      choices: ["Silas", "Saul", "Barnabas", "Simon"],
      answer: "Saul",
      reference: "Acts 13:9",
      category: "New Testament"
    },
    {
      question: "Which king wrote Ecclesiastes?",
      choices: ["David", "Hezekiah", "Josiah", "Solomon"],
      answer: "Solomon",
      reference: "Ecclesiastes 1:1",
      category: "Old Testament"
    },
    {
      question: "Who was the first judge of Israel?",
      choices: ["Gideon", "Samson", "Deborah", "Othniel"],
      answer: "Othniel",
      reference: "Judges 3:9",
      category: "Old Testament"
    },
    {
      question: "How many years did Israel wander in the wilderness?",
      choices: ["20", "30", "50", "40"],
      answer: "40",
      reference: "Numbers 32:13",
      category: "Old Testament"
    },
    {
      question: "Who was Elijah's successor?",
      choices: ["Micaiah", "Jeremiah", "Elisha", "Isaiah"],
      answer: "Elisha",
      reference: "1 Kings 19:16",
      category: "Prophets"
    },
    {
      question: "How many lepers did Jesus heal at once?",
      choices: ["5", "7", "10", "12"],
      answer: "10",
      reference: "Luke 17:12",
      category: "New Testament"
    },
    {
      question: "Who was Moses' wife?",
      choices: ["Miriam", "Deborah", "Zipporah", "Jochebed"],
      answer: "Zipporah",
      reference: "Exodus 2:21",
      category: "Old Testament"
    },
    {
      question: "What did Elijah call down from heaven on Mount Carmel?",
      choices: ["Rain", "Thunder", "Angels", "Fire"],
      answer: "Fire",
      reference: "1 Kings 18:38",
      category: "Prophets"
    },
    {
      question: "Which prophet was taken to heaven in a chariot of fire?",
      choices: ["Enoch", "Moses", "Isaiah", "Elijah"],
      answer: "Elijah",
      reference: "2 Kings 2:11",
      category: "Prophets"
    },
    {
      question: "How many people were fed with five loaves and two fish?",
      choices: ["3,000", "4,000", "7,000", "5,000"],
      answer: "5,000",
      reference: "Matthew 14:21",
      category: "New Testament"
    },
    {
      question: "Who was the first Christian martyr?",
      choices: ["Paul", "James", "Peter", "Stephen"],
      answer: "Stephen",
      reference: "Acts 7:59",
      category: "New Testament"
    },
    {
      question: "What was Daniel's Babylonian name?",
      choices: ["Shadrach", "Meshach", "Belteshazzar", "Abednego"],
      answer: "Belteshazzar",
      reference: "Daniel 1:7",
      category: "Prophets"
    },
    {
      question: "Who was Solomon's mother?",
      choices: ["Abigail", "Michal", "Tamar", "Bathsheba"],
      answer: "Bathsheba",
      reference: "2 Samuel 12:24",
      category: "Old Testament"
    },
    {
      question: "Which disciple was a tax collector?",
      choices: ["Luke", "Mark", "John", "Matthew"],
      answer: "Matthew",
      reference: "Matthew 9:9",
      category: "New Testament"
    },
    {
      question: "How many days was Jonah in the great fish?",
      choices: ["1", "2", "7", "3"],
      answer: "3",
      reference: "Jonah 1:17",
      category: "Prophets"
    },
    {
      question: "Who sang a victory song after crossing the Red Sea?",
      choices: ["Deborah", "Hannah", "Mary", "Miriam"],
      answer: "Miriam",
      reference: "Exodus 15:20",
      category: "Old Testament"
    },
    {
      question: "What did Jacob use as a pillow at Bethel?",
      choices: ["His coat", "Grass", "A stone", "His sandals"],
      answer: "A stone",
      reference: "Genesis 28:11",
      category: "Old Testament"
    },
    {
      question: "Who was the first woman judge in Israel?",
      choices: ["Miriam", "Esther", "Jael", "Deborah"],
      answer: "Deborah",
      reference: "Judges 4:4",
      category: "Old Testament"
    },
    {
      question: "What was the name of Abraham's nephew?",
      choices: ["Ishmael", "Nahor", "Lot", "Bethuel"],
      answer: "Lot",
      reference: "Genesis 12:5",
      category: "Old Testament"
    },
    {
      question: "Who was Rehoboam's father?",
      choices: ["David", "Saul", "Solomon", "Jeroboam"],
      answer: "Solomon",
      reference: "1 Kings 11:43",
      category: "Old Testament"
    },
    {
      question: "How many sons did Jacob have?",
      choices: ["10", "11", "13", "12"],
      answer: "12",
      reference: "Genesis 35:22",
      category: "Old Testament"
    },
    {
      question: "Who baptized the Ethiopian eunuch?",
      choices: ["Peter", "Paul", "Barnabas", "Philip"],
      answer: "Philip",
      reference: "Acts 8:38",
      category: "New Testament"
    },
    {
      question: "What tree did Zacchaeus climb?",
      choices: ["Fig tree", "Olive tree", "Sycamore", "Cedar"],
      answer: "Sycamore",
      reference: "Luke 19:4",
      category: "New Testament"
    },
    {
      question: "Who was the Roman governor who condemned Jesus?",
      choices: ["Herod", "Felix", "Festus", "Pontius Pilate"],
      answer: "Pontius Pilate",
      reference: "Matthew 27:24",
      category: "New Testament"
    },
    {
      question: "Which disciple is called 'the beloved'?",
      choices: ["Peter", "James", "Andrew", "John"],
      answer: "John",
      reference: "John 21:20",
      category: "New Testament"
    },
    {
      question: "What does 'Immanuel' mean?",
      choices: ["God saves", "God is love", "God with us", "God is great"],
      answer: "God with us",
      reference: "Matthew 1:23",
      category: "New Testament"
    },
    {
      question: "How many days did Jesus fast in the wilderness?",
      choices: ["20", "30", "50", "40"],
      answer: "40",
      reference: "Matthew 4:2",
      category: "New Testament"
    },
    {
      question: "What was the last plague on Egypt?",
      choices: ["Darkness", "Frogs", "Locusts", "Death of firstborn"],
      answer: "Death of firstborn",
      reference: "Exodus 12:29",
      category: "Old Testament"
    },
    {
      question: "Where did Jesus turn water into wine?",
      choices: ["Jerusalem", "Nazareth", "Cana", "Bethlehem"],
      answer: "Cana",
      reference: "John 2:1",
      category: "New Testament"
    },
    {
      question: "Who was Abraham's wife?",
      choices: ["Rebekah", "Rachel", "Hagar", "Sarah"],
      answer: "Sarah",
      reference: "Genesis 17:15",
      category: "Old Testament"
    },
    {
      question: "What was the sign of God's covenant with Noah?",
      choices: ["Star", "Dove", "Rainbow", "Cloud"],
      answer: "Rainbow",
      reference: "Genesis 9:13",
      category: "Old Testament"
    },
    {
      question: "Who was thrown into the fiery furnace?",
      choices: ["Daniel and friends", "Elijah and Elisha", "Jeremiah and Baruch", "Shadrach, Meshach, and Abednego"],
      answer: "Shadrach, Meshach, and Abednego",
      reference: "Daniel 3:20",
      category: "Prophets"
    },
    {
      question: "What did Jesus ride into Jerusalem?",
      choices: ["Horse", "Camel", "Donkey", "Mule"],
      answer: "Donkey",
      reference: "Matthew 21:7",
      category: "New Testament"
    },
    {
      question: "Who was the brother of Mary and Martha?",
      choices: ["Peter", "James", "Simon", "Lazarus"],
      answer: "Lazarus",
      reference: "John 11:1",
      category: "New Testament"
    },
    {
      question: "How many virgins were in Jesus' parable of the ten virgins?",
      choices: ["5", "7", "12", "10"],
      answer: "10",
      reference: "Matthew 25:1",
      category: "New Testament"
    },
    {
      question: "What is the greatest commandment?",
      choices: ["Honor your parents", "Do not kill", "Do not steal", "Love the Lord your God"],
      answer: "Love the Lord your God",
      reference: "Matthew 22:37",
      category: "New Testament"
    },
    {
      question: "Who was Ruth's husband?",
      choices: ["Naomi", "Elimelech", "Boaz", "Mahlon"],
      answer: "Boaz",
      reference: "Ruth 4:13",
      category: "Old Testament"
    },
    {
      question: "What was the name of the hill where Jesus was crucified?",
      choices: ["Mount Zion", "Mount of Olives", "Mount Sinai", "Golgotha"],
      answer: "Golgotha",
      reference: "Matthew 27:33",
      category: "New Testament"
    },
    {
      question: "Who wrote most of the New Testament letters?",
      choices: ["Peter", "John", "James", "Paul"],
      answer: "Paul",
      reference: "New Testament",
      category: "New Testament"
    },
    {
      question: "How long did it rain during Noah's flood?",
      choices: ["20 days", "30 days", "100 days", "40 days and nights"],
      answer: "40 days and nights",
      reference: "Genesis 7:12",
      category: "Old Testament"
    },
    {
      question: "What tribe was Paul from?",
      choices: ["Judah", "Levi", "Dan", "Benjamin"],
      answer: "Benjamin",
      reference: "Philippians 3:5",
      category: "New Testament"
    },
    {
      question: "Who was King David's best friend?",
      choices: ["Absalom", "Solomon", "Joab", "Jonathan"],
      answer: "Jonathan",
      reference: "1 Samuel 18:1",
      category: "Old Testament"
    },
    {
      question: "What river did Naaman wash in to be healed of leprosy?",
      choices: ["Nile", "Euphrates", "Jabbok", "Jordan River"],
      answer: "Jordan River",
      reference: "2 Kings 5:14",
      category: "Old Testament"
    },
    {
      question: "Who was the mother of John the Baptist?",
      choices: ["Mary", "Anna", "Salome", "Elizabeth"],
      answer: "Elizabeth",
      reference: "Luke 1:13",
      category: "New Testament"
    },
    {
      question: "How many books of Moses are in the Bible?",
      choices: ["3", "4", "6", "5"],
      answer: "5",
      reference: "Bible",
      category: "Old Testament"
    },
    {
      question: "What was the name of Joseph's wife in Egypt?",
      choices: ["Miriam", "Zipporah", "Rachel", "Asenath"],
      answer: "Asenath",
      reference: "Genesis 41:45",
      category: "Old Testament"
    },
    {
      question: "Who was the high priest who questioned Jesus at his trial?",
      choices: ["Annas", "Pilate", "Herod", "Caiaphas"],
      answer: "Caiaphas",
      reference: "Matthew 26:57",
      category: "New Testament"
    },
    { question: "How many years did Jacob work for Rachel?", choices: ["7", "10", "14", "21"], answer: "14", reference: "Genesis 29:18-28", category: "Old Testament" },
    { question: "Who was the first Gentile convert mentioned in Acts?", choices: ["Lydia", "Cornelius", "The Ethiopian eunuch", "Zacchaeus"], answer: "Cornelius", reference: "Acts 10:1", category: "New Testament" },
    { question: "What was the sign of God's covenant with Noah?", choices: ["Circumcision", "A rainbow", "A burning lamp", "A white dove"], answer: "A rainbow", reference: "Genesis 9:13", category: "Old Testament" },
    { question: "How many psalms are in the book of Psalms?", choices: ["100", "120", "150", "180"], answer: "150", reference: "Psalms", category: "Psalms" },
    { question: "What was the name of the pool where Jesus healed a lame man?", choices: ["Pool of Siloam", "Pool of Bethesda", "Pool of Gibeon", "Pool of Hezekiah"], answer: "Pool of Bethesda", reference: "John 5:2", category: "Gospels" },
    { question: "Who replaced Judas as the twelfth apostle?", choices: ["Barnabas", "Silas", "Matthias", "Timothy"], answer: "Matthias", reference: "Acts 1:26", category: "New Testament" },
    { question: "In which city did Paul and Silas get thrown in prison?", choices: ["Corinth", "Philippi", "Thessalonica", "Ephesus"], answer: "Philippi", reference: "Acts 16:23", category: "New Testament" },
    { question: "Who was Boaz's wife?", choices: ["Naomi", "Orpah", "Rahab", "Ruth"], answer: "Ruth", reference: "Ruth 4:13", category: "Old Testament" },
    { question: "What is the name of the river that flows through Eden?", choices: ["Euphrates", "Pishon", "Jordan", "Nile"], answer: "Pishon", reference: "Genesis 2:11", category: "Old Testament" },
    { question: "How many elders surround the throne of God in Revelation?", choices: ["12", "24", "70", "144"], answer: "24", reference: "Revelation 4:4", category: "New Testament" },
    { question: "Who was the son of David who rebelled against him?", choices: ["Adonijah", "Amnon", "Solomon", "Absalom"], answer: "Absalom", reference: "2 Samuel 15:10", category: "Old Testament" },
    { question: "What was the name of Abraham's second wife?", choices: ["Hagar", "Keturah", "Milcah", "Rebekah"], answer: "Keturah", reference: "Genesis 25:1", category: "Old Testament" },
    { question: "How many times did Peter deny Jesus?", choices: ["Once", "Twice", "Three times", "Four times"], answer: "Three times", reference: "Matthew 26:75", category: "Gospels" },
    { question: "Who was the first person to whom Jesus revealed He was the Messiah?", choices: ["Mary Magdalene", "His disciples", "A Samaritan woman", "Nicodemus"], answer: "A Samaritan woman", reference: "John 4:26", category: "Gospels" },
    { question: "What miracle did Elisha perform with salt?", choices: ["Healed the sick", "Purified bad water", "Melted ice", "Preserved food"], answer: "Purified bad water", reference: "2 Kings 2:21", category: "Prophets" },
    { question: "How many chapters does the book of Revelation have?", choices: ["18", "20", "22", "24"], answer: "22", reference: "Revelation", category: "New Testament" },
    { question: "Who was the Roman governor who condemned Jesus to death?", choices: ["Herod", "Caesar", "Pontius Pilate", "Caiaphas"], answer: "Pontius Pilate", reference: "Matthew 27:24", category: "Gospels" },
    { question: "What was written on the Ark of the Covenant?", choices: ["The Ten Commandments were inside", "The name of God", "The Law of Moses", "A blessing and a curse"], answer: "The Ten Commandments were inside", reference: "Deuteronomy 10:5", category: "Old Testament" },
    { question: "Who was the mother of King Solomon?", choices: ["Michal", "Abigail", "Bathsheba", "Ahinoam"], answer: "Bathsheba", reference: "1 Kings 1:11", category: "Old Testament" },
    { question: "Which prophet was taken up to heaven in a fiery chariot?", choices: ["Elisha", "Isaiah", "Elijah", "Ezekiel"], answer: "Elijah", reference: "2 Kings 2:11", category: "Prophets" },
    { question: "How many books are in the New Testament?", choices: ["21", "25", "27", "29"], answer: "27", reference: "General", category: "New Testament" },
    { question: "What did God change Jacob's name to?", choices: ["Judah", "Joseph", "Israel", "Ishmael"], answer: "Israel", reference: "Genesis 32:28", category: "Old Testament" },
    { question: "Who was the grandmother of Timothy mentioned by Paul?", choices: ["Priscilla", "Eunice", "Lois", "Phoebe"], answer: "Lois", reference: "2 Timothy 1:5", category: "Epistles" },
    { question: "What was the name of the king Esther married?", choices: ["Darius", "Ahasuerus", "Cyrus", "Nebuchadnezzar"], answer: "Ahasuerus", reference: "Esther 2:17", category: "Old Testament" },
    { question: "In Nehemiah, what did God's people rebuild?", choices: ["The Temple", "Jerusalem's wall", "The Tabernacle", "The palace"], answer: "Jerusalem's wall", reference: "Nehemiah 4:6", category: "Old Testament" },
    { question: "Who anointed David as king?", choices: ["Moses", "Eli", "Elijah", "Samuel"], answer: "Samuel", reference: "1 Samuel 16:13", category: "Old Testament" },
    { question: "Which tribe of Israel did Paul belong to?", choices: ["Levi", "Judah", "Dan", "Benjamin"], answer: "Benjamin", reference: "Romans 11:1", category: "Epistles" },
    { question: "How many sons did Jacob have?", choices: ["10", "11", "12", "13"], answer: "12", reference: "Genesis 35:22", category: "Old Testament" },
    { question: "Who wrote the most psalms?", choices: ["Asaph", "Solomon", "David", "Korah"], answer: "David", reference: "Psalms", category: "Psalms" },
    { question: "What city was Paul from?", choices: ["Jerusalem", "Rome", "Tarsus", "Antioch"], answer: "Tarsus", reference: "Acts 21:39", category: "New Testament" },
    { question: "What was the Urim and Thummim used for?", choices: ["Healing the sick", "Determining God's will", "Making sacrifices", "Cleansing the temple"], answer: "Determining God's will", reference: "Numbers 27:21", category: "Old Testament" },
    { question: "Which book contains the story of the valley of dry bones?", choices: ["Isaiah", "Jeremiah", "Daniel", "Ezekiel"], answer: "Ezekiel", reference: "Ezekiel 37:1", category: "Prophets" },
    { question: "What was the name of Moses' mother?", choices: ["Miriam", "Jochebed", "Zipporah", "Deborah"], answer: "Jochebed", reference: "Exodus 6:20", category: "Old Testament" },
    { question: "Who was the first person to greet Jesus in the Temple?", choices: ["Anna", "Elizabeth", "Simeon", "Joseph"], answer: "Simeon", reference: "Luke 2:28", category: "Gospels" },
    { question: "What was the name of King Saul's son who became David's friend?", choices: ["Abner", "Ishbosheth", "Jonathan", "Mephibosheth"], answer: "Jonathan", reference: "1 Samuel 18:1", category: "Old Testament" },
    { question: "How many loaves and fish fed 4000 people?", choices: ["5 loaves 2 fish", "7 loaves few fish", "12 loaves 5 fish", "7 loaves 4 fish"], answer: "7 loaves few fish", reference: "Matthew 15:34-36", category: "Gospels" },
    { question: "Who did Jesus say the greatest commandment was to love?", choices: ["Your neighbor", "God with all your heart", "God and your neighbor", "The Lord your God only"], answer: "God and your neighbor", reference: "Matthew 22:37-39", category: "Gospels" },
    { question: "What is the fruit of the Spirit listed in Galatians?", choices: ["Love joy peace", "Faith hope love", "Kindness goodness faithfulness", "All of the above"], answer: "Love joy peace", reference: "Galatians 5:22", category: "Epistles" },
    { question: "Who was Barnabas's cousin who traveled with Paul?", choices: ["Timothy", "Silas", "Mark", "Luke"], answer: "Mark", reference: "Colossians 4:10", category: "New Testament" },
    { question: "What was the tabernacle used for?", choices: ["Storing the ark", "Worship of God", "Housing the priests", "Sacrificing animals"], answer: "Worship of God", reference: "Exodus 40:34", category: "Old Testament" },
    { question: "Which prophet spoke of a virgin conceiving and bearing a son?", choices: ["Jeremiah", "Ezekiel", "Micah", "Isaiah"], answer: "Isaiah", reference: "Isaiah 7:14", category: "Prophets" },
    { question: "Who was the youngest son of Jacob?", choices: ["Joseph", "Reuben", "Benjamin", "Levi"], answer: "Benjamin", reference: "Genesis 35:18", category: "Old Testament" },
    { question: "What was the name of the place where Jesus ascended into heaven?", choices: ["Bethany", "Bethlehem", "Galilee", "Jerusalem"], answer: "Bethany", reference: "Luke 24:50", category: "Gospels" },
    { question: "In what direction did the Israelites cross the Jordan to enter Canaan?", choices: ["From south to north", "From east to west", "From west to east", "From north to south"], answer: "From east to west", reference: "Joshua 3:14-17", category: "Old Testament" },
    { question: "Who were the two spies sent to Jericho?", choices: ["Caleb and Phinehas", "Joshua and Eleazar", "Salmon and Achan", "Caleb and Joshua"], answer: "Salmon and Achan", reference: "Joshua 2:1", category: "Old Testament" },
    { question: "What was the name of the woman who hid the spies in Jericho?", choices: ["Rahab", "Deborah", "Tamar", "Abigail"], answer: "Rahab", reference: "Joshua 2:1", category: "Old Testament" },
    { question: "How many chapters are in the book of Isaiah?", choices: ["40", "52", "66", "70"], answer: "66", reference: "Isaiah", category: "Prophets" },
    { question: "What was the name of the church where Paul wrote letters most to?", choices: ["Ephesus", "Philippi", "Corinth", "Thessalonica"], answer: "Corinth", reference: "1 Corinthians 1:2", category: "Epistles" },
    { question: "Who was John the Baptist's mother?", choices: ["Anna", "Mary", "Elizabeth", "Salome"], answer: "Elizabeth", reference: "Luke 1:5-13", category: "Gospels" }
  ],

  hard: [
    {
      question: "Who was Mephibosheth's father?",
      choices: ["David", "Saul", "Absalom", "Jonathan"],
      answer: "Jonathan",
      reference: "2 Samuel 9:6",
      category: "Old Testament"
    },
    {
      question: "What was the name of Abraham's brother?",
      choices: ["Lot", "Bethuel", "Nahor", "Terah"],
      answer: "Nahor",
      reference: "Genesis 11:26",
      category: "Old Testament"
    },
    {
      question: "Which prophet married Gomer?",
      choices: ["Jeremiah", "Amos", "Hosea", "Micah"],
      answer: "Hosea",
      reference: "Hosea 1:3",
      category: "Prophets"
    },
    {
      question: "Who was the first king mentioned when Isaiah prophesied?",
      choices: ["Hezekiah", "Ahaz", "Uzziah", "Jotham"],
      answer: "Uzziah",
      reference: "Isaiah 1:1",
      category: "Prophets"
    },
    {
      question: "What was the name of Moses' mother?",
      choices: ["Miriam", "Zipporah", "Rahab", "Jochebed"],
      answer: "Jochebed",
      reference: "Exodus 6:20",
      category: "Old Testament"
    },
    {
      question: "Who was Saul's military general?",
      choices: ["Joab", "David", "Abner", "Ish-bosheth"],
      answer: "Abner",
      reference: "1 Samuel 14:50",
      category: "Old Testament"
    },
    {
      question: "What was the name of the valley where David fought Goliath?",
      choices: ["Valley of Hinnom", "Valley of Jezreel", "Valley of Aijalon", "Valley of Elah"],
      answer: "Valley of Elah",
      reference: "1 Samuel 17:2",
      category: "Old Testament"
    },
    {
      question: "Who was Jezebel's husband?",
      choices: ["Joram", "Omri", "Ahab", "Jehoshaphat"],
      answer: "Ahab",
      reference: "1 Kings 16:31",
      category: "Old Testament"
    },
    {
      question: "What was the name of John the Baptist's father?",
      choices: ["Joseph", "Simeon", "Zechariah", "Joachim"],
      answer: "Zechariah",
      reference: "Luke 1:13",
      category: "New Testament"
    },
    {
      question: "What was Moses' father-in-law's name?",
      choices: ["Caleb", "Aaron", "Hobab", "Jethro"],
      answer: "Jethro",
      reference: "Exodus 3:1",
      category: "Old Testament"
    },
    {
      question: "Who killed Sisera?",
      choices: ["Deborah", "Barak", "Samuel", "Jael"],
      answer: "Jael",
      reference: "Judges 4:21",
      category: "Old Testament"
    },
    {
      question: "Who was the first high priest of Israel?",
      choices: ["Moses", "Eli", "Aaron", "Phinehas"],
      answer: "Aaron",
      reference: "Exodus 28:1",
      category: "Old Testament"
    },
    {
      question: "How many pieces of silver was Joseph sold for?",
      choices: ["10", "30", "20", "40"],
      answer: "20",
      reference: "Genesis 37:28",
      category: "Old Testament"
    },
    {
      question: "What was the name of Elisha's servant?",
      choices: ["Eliezer", "Baruch", "Gehazi", "Zenas"],
      answer: "Gehazi",
      reference: "2 Kings 4:12",
      category: "Prophets"
    },
    {
      question: "What was Abraham's servant's name who found Rebekah?",
      choices: ["Nahor", "Laban", "Bethuel", "Eliezer"],
      answer: "Eliezer",
      reference: "Genesis 15:2",
      category: "Old Testament"
    },
    {
      question: "How many days did it rain during Noah's flood?",
      choices: ["20", "30", "150", "40"],
      answer: "40",
      reference: "Genesis 7:12",
      category: "Old Testament"
    },
    {
      question: "Who replaced Moses as leader of Israel?",
      choices: ["Caleb", "Aaron", "Eleazar", "Joshua"],
      answer: "Joshua",
      reference: "Deuteronomy 31:7",
      category: "Old Testament"
    },
    {
      question: "What was the name of David's first wife?",
      choices: ["Bathsheba", "Abigail", "Ahinoam", "Michal"],
      answer: "Michal",
      reference: "1 Samuel 18:27",
      category: "Old Testament"
    },
    {
      question: "Who was Joseph's youngest brother at the time of their first meeting?",
      choices: ["Levi", "Judah", "Reuben", "Benjamin"],
      answer: "Benjamin",
      reference: "Genesis 42:13",
      category: "Old Testament"
    },
    {
      question: "What was the name of the priest at Shiloh when Samuel was young?",
      choices: ["Eleazar", "Phinehas", "Abiathar", "Eli"],
      answer: "Eli",
      reference: "1 Samuel 1:9",
      category: "Old Testament"
    },
    {
      question: "What was the name of Naomi's husband?",
      choices: ["Boaz", "Mahlon", "Kilion", "Elimelech"],
      answer: "Elimelech",
      reference: "Ruth 1:2",
      category: "Old Testament"
    },
    {
      question: "Who was the mother of James and John the apostles?",
      choices: ["Mary Magdalene", "Joanna", "Susanna", "Salome"],
      answer: "Salome",
      reference: "Matthew 27:56",
      category: "New Testament"
    },
    {
      question: "Who was Timothy's mother?",
      choices: ["Lois", "Priscilla", "Lydia", "Eunice"],
      answer: "Eunice",
      reference: "2 Timothy 1:5",
      category: "New Testament"
    },
    {
      question: "What was the name of the pool where Jesus healed the blind man?",
      choices: ["Bethesda", "Jordan", "Siloam", "Kidron"],
      answer: "Siloam",
      reference: "John 9:7",
      category: "New Testament"
    },
    {
      question: "Who was Barnabas' cousin?",
      choices: ["Timothy", "Titus", "Luke", "Mark"],
      answer: "Mark",
      reference: "Colossians 4:10",
      category: "New Testament"
    },
    {
      question: "What was Aquila's wife's name?",
      choices: ["Lydia", "Dorcas", "Phoebe", "Priscilla"],
      answer: "Priscilla",
      reference: "Acts 18:2",
      category: "New Testament"
    },
    {
      question: "How old was Josiah when he became king?",
      choices: ["6", "10", "12", "8"],
      answer: "8",
      reference: "2 Kings 22:1",
      category: "Old Testament"
    },
    {
      question: "Who was the Moabite king who hired Balaam?",
      choices: ["Eglon", "Mesha", "Og", "Balak"],
      answer: "Balak",
      reference: "Numbers 22:2",
      category: "Old Testament"
    },
    {
      question: "What was the name of Abraham's first son?",
      choices: ["Isaac", "Jacob", "Esau", "Ishmael"],
      answer: "Ishmael",
      reference: "Genesis 16:15",
      category: "Old Testament"
    },
    {
      question: "What mountain did Noah's ark rest on?",
      choices: ["Sinai", "Carmel", "Hermon", "Mount Ararat"],
      answer: "Mount Ararat",
      reference: "Genesis 8:4",
      category: "Old Testament"
    },
    {
      question: "What did Lot's wife turn into when she looked back?",
      choices: ["A stone", "Smoke", "Ash", "A pillar of salt"],
      answer: "A pillar of salt",
      reference: "Genesis 19:26",
      category: "Old Testament"
    },
    {
      question: "What was the name of the angel who appeared to Mary?",
      choices: ["Michael", "Raphael", "Uriel", "Gabriel"],
      answer: "Gabriel",
      reference: "Luke 1:26",
      category: "New Testament"
    },
    {
      question: "Who was the first person to see the risen Jesus?",
      choices: ["Peter", "John", "The disciples", "Mary Magdalene"],
      answer: "Mary Magdalene",
      reference: "John 20:14",
      category: "New Testament"
    },
    {
      question: "How many books are in the Old Testament?",
      choices: ["36", "37", "40", "39"],
      answer: "39",
      reference: "Bible",
      category: "General"
    },
    {
      question: "What was the name of the pool where Jesus healed the paralyzed man?",
      choices: ["Siloam", "Gihon", "En-gedi", "Bethesda"],
      answer: "Bethesda",
      reference: "John 5:2",
      category: "New Testament"
    },
    {
      question: "In which city were followers of Jesus first called Christians?",
      choices: ["Jerusalem", "Rome", "Ephesus", "Antioch"],
      answer: "Antioch",
      reference: "Acts 11:26",
      category: "New Testament"
    },
    {
      question: "Which sister sat at Jesus' feet while the other served?",
      choices: ["Martha", "Joanna", "Mary", "Salome"],
      answer: "Mary",
      reference: "Luke 10:39",
      category: "New Testament"
    },
    {
      question: "Who sold his birthright for a meal?",
      choices: ["Jacob", "Ishmael", "Reuben", "Esau"],
      answer: "Esau",
      reference: "Genesis 25:33",
      category: "Old Testament"
    },
    {
      question: "What was the name of the city where Paul and Silas were jailed?",
      choices: ["Athens", "Corinth", "Rome", "Philippi"],
      answer: "Philippi",
      reference: "Acts 16:23",
      category: "New Testament"
    },
    {
      question: "What was the name of the land where Job lived?",
      choices: ["Ur", "Babylon", "Susa", "Uz"],
      answer: "Uz",
      reference: "Job 1:1",
      category: "Old Testament"
    },
    {
      question: "How many plagues were there in Egypt?",
      choices: ["8", "9", "12", "10"],
      answer: "10",
      reference: "Exodus 7-12",
      category: "Old Testament"
    },
    {
      question: "Who led the rebuilding of Jerusalem's walls?",
      choices: ["Ezra", "Zerubbabel", "Malachi", "Nehemiah"],
      answer: "Nehemiah",
      reference: "Nehemiah 2:17",
      category: "Old Testament"
    },
    {
      question: "Which book of the Bible follows Ezekiel?",
      choices: ["Isaiah", "Jeremiah", "Hosea", "Daniel"],
      answer: "Daniel",
      reference: "Bible",
      category: "Prophets"
    },
    {
      question: "What was the name of Paul's companion who later deserted him?",
      choices: ["Silas", "Barnabas", "Timothy", "Demas"],
      answer: "Demas",
      reference: "2 Timothy 4:10",
      category: "New Testament"
    },
    {
      question: "Who was Mordecai's cousin?",
      choices: ["Ruth", "Naomi", "Rahab", "Esther"],
      answer: "Esther",
      reference: "Esther 2:7",
      category: "Old Testament"
    },
    {
      question: "Who was the priest of Salem who blessed Abraham?",
      choices: ["Aaron", "Eli", "Phinehas", "Melchizedek"],
      answer: "Melchizedek",
      reference: "Genesis 14:18",
      category: "Old Testament"
    },
    {
      question: "Who was the mother of Samuel?",
      choices: ["Miriam", "Naomi", "Hannah", "Deborah"],
      answer: "Hannah",
      reference: "1 Samuel 1:20",
      category: "Old Testament"
    },
    {
      question: "What was the sign in the sky that stopped Joshua's battle?",
      choices: ["A rainbow", "A lunar eclipse", "A bright star", "The sun stood still"],
      answer: "The sun stood still",
      reference: "Joshua 10:13",
      category: "Old Testament"
    },
    {
      question: "Who was Moses' brother?",
      choices: ["Joshua", "Caleb", "Nahor", "Aaron"],
      answer: "Aaron",
      reference: "Exodus 4:14",
      category: "Old Testament"
    },
    {
      question: "What was the name of the Roman centurion who said 'Truly this man was the Son of God'?",
      choices: ["Cornelius", "Claudius", "Julius", "The centurion at the cross"],
      answer: "The centurion at the cross",
      reference: "Matthew 27:54",
      category: "New Testament"
    }
  ],

  expert: [
    {
      question: "How many cubits long was Noah's Ark?",
      choices: ["200", "400", "300", "500"],
      answer: "300",
      reference: "Genesis 6:15",
      category: "Old Testament"
    },
    {
      question: "What were the names of Job's three friends?",
      choices: ["Elihu, Bildad, and Zophar", "Eliphaz, Elihu, and Zophar", "Nahor, Bildad, and Zophar", "Eliphaz, Bildad, and Zophar"],
      answer: "Eliphaz, Bildad, and Zophar",
      reference: "Job 2:11",
      category: "Old Testament"
    },
    {
      question: "Which Psalm is the longest chapter in the Bible?",
      choices: ["Psalm 22", "Psalm 91", "Psalm 150", "Psalm 119"],
      answer: "Psalm 119",
      reference: "Psalm 119",
      category: "Old Testament"
    },
    {
      question: "What is the Hebrew meaning of 'Immanuel'?",
      choices: ["God saves", "God reigns", "God is holy", "God with us"],
      answer: "God with us",
      reference: "Matthew 1:23",
      category: "New Testament"
    },
    {
      question: "Which king discovered the Book of the Law during temple repairs?",
      choices: ["Hezekiah", "Uzziah", "Josiah", "Joash"],
      answer: "Josiah",
      reference: "2 Kings 22:8",
      category: "Old Testament"
    },
    {
      question: "How many smooth stones did David pick up before facing Goliath?",
      choices: ["3", "4", "5", "7"],
      answer: "5",
      reference: "1 Samuel 17:40",
      category: "Old Testament"
    },
    {
      question: "How many years did Solomon spend building the temple?",
      choices: ["5", "10", "7", "12"],
      answer: "7",
      reference: "1 Kings 6:38",
      category: "Old Testament"
    },
    {
      question: "Who was the oldest person in the Bible?",
      choices: ["Noah", "Adam", "Abraham", "Methuselah"],
      answer: "Methuselah",
      reference: "Genesis 5:27",
      category: "Old Testament"
    },
    {
      question: "What was the first city built mentioned in the Bible?",
      choices: ["Babylon", "Ur", "Nineveh", "Enoch"],
      answer: "Enoch",
      reference: "Genesis 4:17",
      category: "Old Testament"
    },
    {
      question: "How many elders surround the throne in Revelation?",
      choices: ["12", "14", "144", "24"],
      answer: "24",
      reference: "Revelation 4:4",
      category: "New Testament"
    },
    {
      question: "What tribe was Barnabas from?",
      choices: ["Judah", "Benjamin", "Issachar", "Levi"],
      answer: "Levi",
      reference: "Acts 4:36",
      category: "New Testament"
    },
    {
      question: "Who was Onesimus's master?",
      choices: ["Paul", "Timothy", "Titus", "Philemon"],
      answer: "Philemon",
      reference: "Philemon 1:10",
      category: "New Testament"
    },
    {
      question: "What was the name of the scribe who wrote Jeremiah's words?",
      choices: ["Ezra", "Shaphan", "Hilkiah", "Baruch"],
      answer: "Baruch",
      reference: "Jeremiah 36:4",
      category: "Prophets"
    },
    {
      question: "How many years did Israel spend in Egypt?",
      choices: ["400", "450", "480", "430"],
      answer: "430",
      reference: "Exodus 12:40",
      category: "Old Testament"
    },
    {
      question: "Which two disciples were called 'Sons of Thunder'?",
      choices: ["Peter and Andrew", "Philip and Bartholomew", "Simon and Judas", "James and John"],
      answer: "James and John",
      reference: "Mark 3:17",
      category: "New Testament"
    },
    {
      question: "What was the name of the magician who opposed Paul in Cyprus?",
      choices: ["Simon", "Jannes", "Jambres", "Elymas"],
      answer: "Elymas",
      reference: "Acts 13:8",
      category: "New Testament"
    },
    {
      question: "How many seals are in the book of Revelation?",
      choices: ["4", "5", "6", "7"],
      answer: "7",
      reference: "Revelation 5-8",
      category: "New Testament"
    },
    {
      question: "What was the name of the prophetess who recognized baby Jesus at the temple?",
      choices: ["Miriam", "Deborah", "Huldah", "Anna"],
      answer: "Anna",
      reference: "Luke 2:36",
      category: "New Testament"
    },
    {
      question: "What was the name of the Roman centurion first converted to Christianity?",
      choices: ["Claudius", "Julius", "Festus", "Cornelius"],
      answer: "Cornelius",
      reference: "Acts 10:1",
      category: "New Testament"
    },
    {
      question: "What was Samson's riddle at his wedding feast about?",
      choices: ["A bear and grapes", "A serpent and grain", "An eagle and meat", "A lion and honey"],
      answer: "A lion and honey",
      reference: "Judges 14:14",
      category: "Old Testament"
    },
    {
      question: "What did God write on the wall at Belshazzar's feast?",
      choices: ["Ichabod", "Eli Eli Lama Sabachthani", "Maranatha", "Mene, Mene, Tekel, Upharsin"],
      answer: "Mene, Mene, Tekel, Upharsin",
      reference: "Daniel 5:25",
      category: "Prophets"
    },
    {
      question: "What was the name of the city where Abraham lived before Canaan?",
      choices: ["Haran", "Babylon", "Damascus", "Ur of the Chaldeans"],
      answer: "Ur of the Chaldeans",
      reference: "Genesis 11:31",
      category: "Old Testament"
    },
    {
      question: "What prophetic book did Philip read with the Ethiopian eunuch?",
      choices: ["Jeremiah", "Ezekiel", "Daniel", "Isaiah"],
      answer: "Isaiah",
      reference: "Acts 8:28",
      category: "New Testament"
    },
    {
      question: "How many times did Naaman dip in the Jordan to be healed?",
      choices: ["3", "5", "10", "7"],
      answer: "7",
      reference: "2 Kings 5:14",
      category: "Old Testament"
    },
    {
      question: "Who was the high priest when Jesus was tried before the Sanhedrin?",
      choices: ["Annas", "Phinehas", "Ananias", "Caiaphas"],
      answer: "Caiaphas",
      reference: "Matthew 26:57",
      category: "New Testament"
    },
    {
      question: "What was the name of the place where Jacob wrestled with the angel?",
      choices: ["Bethel", "Mahanaim", "Shiloh", "Peniel"],
      answer: "Peniel",
      reference: "Genesis 32:30",
      category: "Old Testament"
    },
    {
      question: "Which verse in Isaiah foretold a virgin birth?",
      choices: ["Isaiah 9:6", "Isaiah 53:1", "Isaiah 40:3", "Isaiah 7:14"],
      answer: "Isaiah 7:14",
      reference: "Isaiah 7:14",
      category: "Prophets"
    },
    {
      question: "How many sons did Aaron have?",
      choices: ["2", "3", "6", "4"],
      answer: "4",
      reference: "Exodus 6:23",
      category: "Old Testament"
    },
    {
      question: "What was the name of the island where John received his vision?",
      choices: ["Cyprus", "Crete", "Malta", "Patmos"],
      answer: "Patmos",
      reference: "Revelation 1:9",
      category: "New Testament"
    },
    {
      question: "Who was the judge who made a vow resulting in his daughter's sacrifice?",
      choices: ["Gideon", "Samson", "Othniel", "Jephthah"],
      answer: "Jephthah",
      reference: "Judges 11:30",
      category: "Old Testament"
    },
    {
      question: "What was the name of the Philistine city where the Ark was taken?",
      choices: ["Gaza", "Gath", "Ekron", "Ashdod"],
      answer: "Ashdod",
      reference: "1 Samuel 5:1",
      category: "Old Testament"
    },
    {
      question: "Who was the grandmother of Timothy?",
      choices: ["Eunice", "Priscilla", "Phoebe", "Lois"],
      answer: "Lois",
      reference: "2 Timothy 1:5",
      category: "New Testament"
    },
    {
      question: "How many cubits wide was Noah's Ark?",
      choices: ["30", "100", "150", "50"],
      answer: "50",
      reference: "Genesis 6:15",
      category: "Old Testament"
    },
    {
      question: "What was the name of Moses' father?",
      choices: ["Aaron", "Kohath", "Levi", "Amram"],
      answer: "Amram",
      reference: "Exodus 6:20",
      category: "Old Testament"
    },
    {
      question: "Which prophet saw a valley of dry bones?",
      choices: ["Isaiah", "Jeremiah", "Daniel", "Ezekiel"],
      answer: "Ezekiel",
      reference: "Ezekiel 37:1",
      category: "Prophets"
    },
    {
      question: "What was the name of the king of Tyre who helped Solomon build the temple?",
      choices: ["Mesha", "Ithobal", "Pygmalion", "Hiram"],
      answer: "Hiram",
      reference: "1 Kings 5:1",
      category: "Old Testament"
    },
    {
      question: "What was the likely meaning of 'Selah' in the Psalms?",
      choices: ["Praise God", "Forever", "Amen", "A musical pause"],
      answer: "A musical pause",
      reference: "Psalms",
      category: "Old Testament"
    },
    {
      question: "Who was Paul's companion on his second missionary journey?",
      choices: ["Barnabas", "Mark", "Luke", "Silas"],
      answer: "Silas",
      reference: "Acts 15:40",
      category: "New Testament"
    },
    {
      question: "Which Hebrew month was Passover celebrated in?",
      choices: ["Adar", "Tishri", "Sivan", "Nisan"],
      answer: "Nisan",
      reference: "Exodus 12:1-2",
      category: "Old Testament"
    },
    {
      question: "What was the weight of the head of Goliath's spear?",
      choices: ["300 shekels of iron", "400 shekels of iron", "800 shekels of iron", "600 shekels of iron"],
      answer: "600 shekels of iron",
      reference: "1 Samuel 17:7",
      category: "Old Testament"
    },
    {
      question: "How many cities of refuge were in Israel?",
      choices: ["3", "4", "12", "6"],
      answer: "6",
      reference: "Numbers 35:13",
      category: "Old Testament"
    },
    {
      question: "What was the name of the false prophet who opposed Jeremiah?",
      choices: ["Ahab", "Zedekiah", "Shemaiah", "Hananiah"],
      answer: "Hananiah",
      reference: "Jeremiah 28:1",
      category: "Prophets"
    },
    {
      question: "Who was the first person recorded as playing musical instruments?",
      choices: ["David", "Miriam", "Asaph", "Jubal"],
      answer: "Jubal",
      reference: "Genesis 4:21",
      category: "Old Testament"
    },
    {
      question: "Who wrote the book of Lamentations?",
      choices: ["Isaiah", "Ezekiel", "Daniel", "Jeremiah"],
      answer: "Jeremiah",
      reference: "Lamentations",
      category: "Prophets"
    },
    {
      question: "How many times did Elijah stretch himself over the widow's dead son?",
      choices: ["1", "2", "4", "3"],
      answer: "3",
      reference: "1 Kings 17:21",
      category: "Prophets"
    },
    {
      question: "What was the name of the Chaldean king who conquered Jerusalem?",
      choices: ["Belshazzar", "Cyrus", "Darius", "Nebuchadnezzar"],
      answer: "Nebuchadnezzar",
      reference: "2 Kings 24:1",
      category: "Prophets"
    },
    {
      question: "What did the Ark of the Covenant contain?",
      choices: ["Only the Ten Commandments", "The Urim and Thummim only", "Only the golden pot of manna", "The tablets, Aaron's rod, and manna"],
      answer: "The tablets, Aaron's rod, and manna",
      reference: "Hebrews 9:4",
      category: "Old Testament"
    },
    {
      question: "What was the name of the first council of the church?",
      choices: ["Council of Nicaea", "Council of Antioch", "Council of Ephesus", "Jerusalem Council"],
      answer: "Jerusalem Council",
      reference: "Acts 15:6",
      category: "New Testament"
    },
    {
      question: "Who was Ruth's first husband?",
      choices: ["Boaz", "Elimelech", "Kilion", "Mahlon"],
      answer: "Mahlon",
      reference: "Ruth 4:10",
      category: "Old Testament"
    },
    {
      question: "How many years did the Israelites wander before entering the Promised Land?",
      choices: ["20", "30", "50", "40"],
      answer: "40",
      reference: "Joshua 5:6",
      category: "Old Testament"
    }
  ]
};
