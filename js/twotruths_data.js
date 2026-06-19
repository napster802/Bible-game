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
    ], lieIndex: 2, reference: "Matthew 4:18; 10:1-4" },

    { subject: "Isaac", statements: [
      "Isaac was the son of Abraham and Sarah",
      "Isaac married Rebekah",
      "Isaac was sacrificed by Abraham on Mount Moriah"
    ], lieIndex: 2, reference: "Genesis 21:3; 24:67; 22:11-13" },

    { subject: "Rebekah", statements: [
      "Rebekah was Isaac's wife",
      "Rebekah gave birth to twins, Jacob and Esau",
      "Rebekah was the sister of Rachel and Leah"
    ], lieIndex: 2, reference: "Genesis 24:67; 25:24-26; 29:16" },

    { subject: "Rachel and Leah", statements: [
      "Leah was Jacob's first wife",
      "Rachel was Joseph's mother",
      "Rachel was Jacob's first wife"
    ], lieIndex: 2, reference: "Genesis 29:16-30; 30:22-24" },

    { subject: "Benjamin", statements: [
      "Benjamin was Jacob's youngest son",
      "Benjamin's mother Rachel died giving birth to him",
      "Benjamin was sold into slavery in Egypt by his brothers"
    ], lieIndex: 2, reference: "Genesis 35:18-19; 37:28" },

    { subject: "Judah (son of Jacob)", statements: [
      "Judah was one of Jacob's twelve sons",
      "Judah suggested selling Joseph instead of killing him",
      "Judah was the firstborn son of Jacob"
    ], lieIndex: 2, reference: "Genesis 35:23; 37:26-27; 49:3" },

    { subject: "Aaron", statements: [
      "Aaron was Moses' older brother",
      "Aaron served as the first high priest of Israel",
      "Aaron led the Israelites across the Jordan River into Canaan"
    ], lieIndex: 2, reference: "Exodus 7:7; 28:1; Joshua 3:14-17" },

    { subject: "Miriam", statements: [
      "Miriam was the sister of Moses and Aaron",
      "Miriam watched over baby Moses in the river",
      "Miriam was the mother of Moses"
    ], lieIndex: 2, reference: "Exodus 2:4; 15:20; 6:20" },

    { subject: "Caleb", statements: [
      "Caleb was one of the twelve spies sent into Canaan",
      "Caleb and Joshua were the only spies who gave a good report of Canaan",
      "Caleb was one of the twelve apostles of Jesus"
    ], lieIndex: 2, reference: "Numbers 13:6; 14:6-9" },

    { subject: "Deborah", statements: [
      "Deborah was a judge and prophetess of Israel",
      "Deborah helped lead Israel to victory over Sisera's army",
      "Deborah was Israel's first king"
    ], lieIndex: 2, reference: "Judges 4:4,14-15" },

    { subject: "Boaz and Naomi", statements: [
      "Boaz was a wealthy relative of Naomi",
      "Naomi was Ruth's mother-in-law",
      "Boaz was Ruth's father"
    ], lieIndex: 2, reference: "Ruth 1:4; 2:1; 4:13" },

    { subject: "Samuel", statements: [
      "Samuel was dedicated to the Lord's service as a child by his mother Hannah",
      "Samuel anointed both Saul and David as kings",
      "Samuel was Israel's first king"
    ], lieIndex: 2, reference: "1 Samuel 1:24-28; 10:1; 16:13" },

    { subject: "Saul (the king)", statements: [
      "Saul was the first king of Israel",
      "Saul was anointed king by the prophet Samuel",
      "Saul was the father of David"
    ], lieIndex: 2, reference: "1 Samuel 10:1; 16:13" },

    { subject: "Jonathan (Saul's son)", statements: [
      "Jonathan was the son of King Saul",
      "Jonathan was a close friend of David",
      "Jonathan became king of Israel after his father Saul died"
    ], lieIndex: 2, reference: "1 Samuel 14:1; 18:1-3; 31:2" },

    { subject: "Abigail", statements: [
      "Abigail was first married to a man named Nabal",
      "Abigail later became one of David's wives",
      "Abigail was the mother of Solomon"
    ], lieIndex: 2, reference: "1 Samuel 25:3,39-42; 2 Samuel 12:24" },

    { subject: "Bathsheba", statements: [
      "Bathsheba was the wife of Uriah the Hittite before David",
      "Bathsheba became the mother of Solomon",
      "Bathsheba was David's first wife"
    ], lieIndex: 2, reference: "2 Samuel 11:3; 12:24" },

    { subject: "Absalom", statements: [
      "Absalom was one of King David's sons",
      "Absalom led a rebellion against his father David",
      "Absalom became king of Israel after David's death"
    ], lieIndex: 2, reference: "2 Samuel 3:3; 15:10-12; 1 Kings 1:30" },

    { subject: "Rehoboam and Jeroboam", statements: [
      "Rehoboam was Solomon's son",
      "The kingdom of Israel split into two during Rehoboam's reign",
      "Jeroboam was a son of Solomon"
    ], lieIndex: 2, reference: "1 Kings 11:43; 12:16-20; 11:26" },

    { subject: "Elisha", statements: [
      "Elisha was the successor to the prophet Elijah",
      "Elisha performed a miracle multiplying a widow's oil",
      "Elisha was taken up to heaven in a whirlwind"
    ], lieIndex: 2, reference: "2 Kings 2:9-13; 4:1-7; 2:11" },

    { subject: "Naaman", statements: [
      "Naaman was a commander of the Syrian army",
      "Naaman was healed of leprosy by dipping in the Jordan River",
      "Naaman was an Israelite prophet"
    ], lieIndex: 2, reference: "2 Kings 5:1,14" },

    { subject: "Hezekiah", statements: [
      "Hezekiah was a king of Judah known for his faithfulness",
      "Hezekiah's life was extended fifteen years after he prayed",
      "Hezekiah built the first Temple in Jerusalem"
    ], lieIndex: 2, reference: "2 Kings 18:5-6; 20:1-6; 1 Kings 6:1" },

    { subject: "Josiah", statements: [
      "Josiah became king of Judah at age eight",
      "Josiah led a great reform after the Book of the Law was found in the Temple",
      "Josiah was carried into Babylonian captivity"
    ], lieIndex: 2, reference: "2 Kings 22:1,8-13; 23:1-3" },

    { subject: "Nebuchadnezzar", statements: [
      "Nebuchadnezzar was king of Babylon",
      "Nebuchadnezzar had a dream that Daniel interpreted",
      "Nebuchadnezzar was thrown into a den of lions"
    ], lieIndex: 2, reference: "Daniel 1:1; 2:1,24-28; 6:16" },

    { subject: "Belshazzar", statements: [
      "Belshazzar saw mysterious handwriting appear on a wall",
      "Daniel interpreted the writing on the wall for Belshazzar",
      "Belshazzar was thrown into a fiery furnace"
    ], lieIndex: 2, reference: "Daniel 5:5,17,25-28; 3:19-23" },

    { subject: "Shadrach, Meshach, and Abednego", statements: [
      "Shadrach, Meshach, and Abednego were thrown into a fiery furnace",
      "They refused to bow down to a golden image",
      "They were thrown into a den of lions"
    ], lieIndex: 2, reference: "Daniel 3:12,20; 6:16" },

    { subject: "Ezra", statements: [
      "Ezra was a priest and scribe who led a return to Jerusalem",
      "Ezra taught the Law of Moses to the returned exiles",
      "Ezra rebuilt the walls of Jerusalem"
    ], lieIndex: 2, reference: "Ezra 7:6,10; Nehemiah 6:15" },

    { subject: "Nehemiah", statements: [
      "Nehemiah rebuilt the walls of Jerusalem",
      "Nehemiah served as cupbearer to the Persian king",
      "Nehemiah was a high priest in Jerusalem"
    ], lieIndex: 2, reference: "Nehemiah 6:15; 1:11" },

    { subject: "Mordecai and Haman", statements: [
      "Mordecai was Esther's cousin who raised her",
      "Haman plotted to destroy the Jewish people",
      "Haman was Esther's husband"
    ], lieIndex: 2, reference: "Esther 2:7,15-17; 3:6" },

    { subject: "Isaiah", statements: [
      "Isaiah was a prophet who prophesied during the reigns of several kings of Judah",
      "Isaiah prophesied about a coming Messiah",
      "Isaiah was taken into Babylonian exile"
    ], lieIndex: 2, reference: "Isaiah 1:1; 9:6" },

    { subject: "Jeremiah", statements: [
      "Jeremiah is known as the \"weeping prophet\"",
      "Jeremiah prophesied the fall of Jerusalem to Babylon",
      "Jeremiah was a king of Judah"
    ], lieIndex: 2, reference: "Jeremiah 9:1; 25:8-11" },

    { subject: "Ezekiel", statements: [
      "Ezekiel was a prophet who had a vision of a valley of dry bones",
      "Ezekiel prophesied during the Babylonian exile",
      "Ezekiel interpreted Nebuchadnezzar's dreams"
    ], lieIndex: 2, reference: "Ezekiel 37:1-10; 1:1-3; Daniel 2:24-28" },

    { subject: "Hosea", statements: [
      "Hosea was commanded by God to marry an unfaithful woman named Gomer",
      "Hosea's marriage symbolized Israel's unfaithfulness to God",
      "Hosea was swallowed by a great fish"
    ], lieIndex: 2, reference: "Hosea 1:2-3; Jonah 1:17" },

    { subject: "Amos", statements: [
      "Amos was a shepherd before becoming a prophet",
      "Amos prophesied against social injustice in Israel",
      "Amos was a king of Israel"
    ], lieIndex: 2, reference: "Amos 1:1; 5:24" },

    { subject: "Zacchaeus", statements: [
      "Zacchaeus was a tax collector",
      "Zacchaeus climbed a tree to see Jesus",
      "Zacchaeus was one of the twelve apostles"
    ], lieIndex: 2, reference: "Luke 19:2,4" },

    { subject: "Lazarus", statements: [
      "Lazarus was raised from the dead by Jesus",
      "Lazarus was the brother of Mary and Martha",
      "Lazarus was raised from the dead after being in the tomb for one day"
    ], lieIndex: 2, reference: "John 11:1-2,17,43-44" },

    { subject: "Martha and Mary (of Bethany)", statements: [
      "Martha was busy preparing while Mary sat listening to Jesus",
      "Martha and Mary were sisters of Lazarus",
      "Martha and Mary were the mother and sister of Jesus"
    ], lieIndex: 2, reference: "Luke 10:38-40; John 11:1-2" },

    { subject: "Nicodemus", statements: [
      "Nicodemus was a Pharisee who came to Jesus at night",
      "Nicodemus helped prepare Jesus' body for burial",
      "Nicodemus was one of the twelve apostles"
    ], lieIndex: 2, reference: "John 3:1-2; 19:39" },

    { subject: "Pontius Pilate", statements: [
      "Pilate was the Roman governor who presided over Jesus' trial",
      "Pilate washed his hands to declare himself innocent of Jesus' blood",
      "Pilate was a king of the Jews"
    ], lieIndex: 2, reference: "Matthew 27:2,24" },

    { subject: "Herod the Great", statements: [
      "Herod ordered the killing of male infants in Bethlehem",
      "Herod was troubled when the wise men asked about a newborn king",
      "Herod baptized Jesus in the Jordan River"
    ], lieIndex: 2, reference: "Matthew 2:3,16; 3:13-16" },

    { subject: "Stephen", statements: [
      "Stephen was the first Christian martyr",
      "Stephen was stoned to death for his faith",
      "Stephen was one of the twelve original apostles"
    ], lieIndex: 2, reference: "Acts 6:5; 7:58-60" },

    { subject: "Philip the Evangelist", statements: [
      "Philip preached the gospel to an Ethiopian eunuch",
      "Philip baptized many people in Samaria",
      "Philip was stoned to death in Jerusalem"
    ], lieIndex: 2, reference: "Acts 8:5-12,26-38; 7:58-60" },

    { subject: "Barnabas", statements: [
      "Barnabas traveled with Paul on missionary journeys",
      "Barnabas sold property and gave the money to the apostles",
      "Barnabas was one of the twelve apostles chosen by Jesus"
    ], lieIndex: 2, reference: "Acts 4:36-37; 13:2-3" },

    { subject: "Timothy", statements: [
      "Timothy was a young pastor mentored by Paul",
      "Two New Testament letters are addressed to Timothy",
      "Timothy wrote the book of Acts"
    ], lieIndex: 2, reference: "1 Timothy 1:1-2; 2 Timothy 1:1-2" },

    { subject: "Silas", statements: [
      "Silas traveled with Paul on missionary journeys",
      "Silas was imprisoned with Paul in Philippi",
      "Silas was one of the twelve apostles chosen by Jesus"
    ], lieIndex: 2, reference: "Acts 15:40; 16:23-25" },

    { subject: "Apollos", statements: [
      "Apollos was an eloquent teacher well-versed in the Scriptures",
      "Apollos was instructed further in the faith by Aquila and Priscilla",
      "Apollos wrote the book of Revelation"
    ], lieIndex: 2, reference: "Acts 18:24,26" },

    { subject: "Lydia", statements: [
      "Lydia was a seller of purple cloth",
      "Lydia was the first convert in Philippi recorded in Acts",
      "Lydia was the wife of the apostle Paul"
    ], lieIndex: 2, reference: "Acts 16:14-15" },

    { subject: "Cornelius", statements: [
      "Cornelius was a Roman centurion",
      "Cornelius and his household were among the first Gentile converts",
      "Cornelius was a high priest in Jerusalem"
    ], lieIndex: 2, reference: "Acts 10:1,44-48" },

    { subject: "Ananias and Sapphira", statements: [
      "Ananias and Sapphira lied to the apostles about money from a land sale",
      "Ananias and Sapphira both died after lying to the Holy Spirit",
      "Ananias and Sapphira were early Christian missionaries to Rome"
    ], lieIndex: 2, reference: "Acts 5:1-2,5,10" },

    { subject: "The Prodigal Son (parable)", statements: [
      "The younger son asked his father for his inheritance early",
      "The father celebrated his son's return with a feast",
      "The older son left home for a foreign country first"
    ], lieIndex: 2, reference: "Luke 15:11-24" },

    { subject: "The Good Samaritan (parable)", statements: [
      "A priest and a Levite passed by the injured man without helping",
      "A Samaritan stopped to help the injured man",
      "The injured man was a Roman soldier"
    ], lieIndex: 2, reference: "Luke 10:30-34" },

    { subject: "The Transfiguration", statements: [
      "Jesus was transfigured on a mountain before Peter, James, and John",
      "Moses and Elijah appeared with Jesus during the Transfiguration",
      "The Transfiguration happened on the same night as the Last Supper"
    ], lieIndex: 2, reference: "Matthew 17:1-3" }
  ]
};
