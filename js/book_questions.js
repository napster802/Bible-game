/* ============================================================
   Bible Challenge Arena - Book & Category Question Bank
   A second question bank, organized by Bible book (Genesis to
   Revelation) and then by answer-type category (character,
   animals, things, places, events), for the Host Game "By Book
   & Category" mode. Used alongside (not replacing) the
   difficulty-based QUESTION_DB in questions.js, which still
   powers Solo/Pass & Play/Daily/Sabbath modes.

   Each question keeps the same shape as QUESTION_DB entries
   (question, choices[4], answer, reference) plus a `category`
   label for display and a `difficulty` tag so the host's
   Difficulty selector can still filter within a book+category
   pool. Sparse/short books intentionally have fewer questions
   (or none yet) rather than padded filler - see BookQuestions.getCount().
   ============================================================ */
const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
];

const ANSWER_CATEGORIES = [
  { id: 'character', label: 'Character' },
  { id: 'animals', label: 'Animals' },
  { id: 'things', label: 'Things' },
  { id: 'places', label: 'Places' },
  { id: 'events', label: 'Events' }
];

const BOOK_QUESTION_DB = {
  Genesis: {
    character: [
      { question: "Who was the first man created by God?", choices: ["Adam", "Noah", "Abraham", "Cain"], answer: "Adam", reference: "Genesis 2:7", category: "Character", difficulty: "easy" },
      { question: "Who was the first woman, formed from Adam's rib?", choices: ["Sarah", "Eve", "Rachel", "Rebekah"], answer: "Eve", reference: "Genesis 2:22", category: "Character", difficulty: "easy" },
      { question: "Who killed his brother Abel out of jealousy?", choices: ["Cain", "Seth", "Ham", "Esau"], answer: "Cain", reference: "Genesis 4:8", category: "Character", difficulty: "easy" },
      { question: "Which son of Adam and Eve was murdered by his brother?", choices: ["Seth", "Abel", "Cain", "Enoch"], answer: "Abel", reference: "Genesis 4:8", category: "Character", difficulty: "easy" },
      { question: "Who built the ark to save his family and the animals from the flood?", choices: ["Noah", "Shem", "Lamech", "Methuselah"], answer: "Noah", reference: "Genesis 6:14", category: "Character", difficulty: "easy" },
      { question: "Which of Noah's sons became the ancestor of Abraham?", choices: ["Ham", "Japheth", "Shem", "Canaan"], answer: "Shem", reference: "Genesis 11:10-26", category: "Character", difficulty: "hard" },
      { question: "Which son of Noah saw his father's nakedness and was cursed?", choices: ["Shem", "Japheth", "Ham", "Canaan"], answer: "Ham", reference: "Genesis 9:22-25", category: "Character", difficulty: "hard" },
      { question: "Who was called by God to leave Ur and travel to Canaan, becoming the father of many nations?", choices: ["Lot", "Abraham", "Isaac", "Terah"], answer: "Abraham", reference: "Genesis 12:1", category: "Character", difficulty: "easy" },
      { question: "Who was Abraham's wife, originally named Sarai?", choices: ["Hagar", "Rebekah", "Sarah", "Leah"], answer: "Sarah", reference: "Genesis 17:15", category: "Character", difficulty: "easy" },
      { question: "Who was Abraham's nephew who traveled with him to Canaan?", choices: ["Lot", "Ishmael", "Nahor", "Eliezer"], answer: "Lot", reference: "Genesis 12:5", category: "Character", difficulty: "medium" },
      { question: "Who was Sarah's Egyptian maidservant and the mother of Ishmael?", choices: ["Leah", "Rachel", "Hagar", "Bilhah"], answer: "Hagar", reference: "Genesis 16:1", category: "Character", difficulty: "medium" },
      { question: "Who was the son of Abraham and Hagar?", choices: ["Isaac", "Ishmael", "Esau", "Midian"], answer: "Ishmael", reference: "Genesis 16:15", category: "Character", difficulty: "medium" },
      { question: "Who was the son of promise born to Abraham and Sarah in their old age?", choices: ["Isaac", "Ishmael", "Jacob", "Esau"], answer: "Isaac", reference: "Genesis 21:3", category: "Character", difficulty: "easy" },
      { question: "Who became Isaac's wife after Abraham's servant found her at a well?", choices: ["Rebekah", "Rachel", "Leah", "Zipporah"], answer: "Rebekah", reference: "Genesis 24:67", category: "Character", difficulty: "easy" },
      { question: "Who was Isaac's elder twin son, a skilled hunter?", choices: ["Jacob", "Esau", "Reuben", "Laban"], answer: "Esau", reference: "Genesis 25:25", category: "Character", difficulty: "medium" },
      { question: "Who was Isaac's younger twin son, later renamed Israel?", choices: ["Esau", "Laban", "Jacob", "Joseph"], answer: "Jacob", reference: "Genesis 25:26", category: "Character", difficulty: "easy" },
      { question: "Who was Jacob's uncle and father-in-law in Haran?", choices: ["Laban", "Nahor", "Bethuel", "Terah"], answer: "Laban", reference: "Genesis 29:10", category: "Character", difficulty: "medium" },
      { question: "Who was Jacob's first wife, given to him in place of her sister?", choices: ["Rachel", "Leah", "Bilhah", "Zilpah"], answer: "Leah", reference: "Genesis 29:23", category: "Character", difficulty: "medium" },
      { question: "Who was Jacob's beloved second wife, for whom he worked fourteen years?", choices: ["Leah", "Dinah", "Rachel", "Zilpah"], answer: "Rachel", reference: "Genesis 29:28", category: "Character", difficulty: "medium" },
      { question: "Who was Jacob's firstborn son?", choices: ["Reuben", "Simeon", "Levi", "Judah"], answer: "Reuben", reference: "Genesis 29:32", category: "Character", difficulty: "medium" },
      { question: "Which of Jacob's sons proposed selling Joseph rather than killing him?", choices: ["Reuben", "Judah", "Simeon", "Levi"], answer: "Judah", reference: "Genesis 37:26-27", category: "Character", difficulty: "hard" },
      { question: "Which of Jacob's sons was sold into slavery by his brothers and rose to power in Egypt?", choices: ["Benjamin", "Joseph", "Reuben", "Dan"], answer: "Joseph", reference: "Genesis 37:28", category: "Character", difficulty: "easy" },
      { question: "Who was Jacob's youngest son, the only full brother of Joseph?", choices: ["Benjamin", "Dan", "Gad", "Asher"], answer: "Benjamin", reference: "Genesis 35:18", category: "Character", difficulty: "medium" },
      { question: "Who was the Egyptian official who purchased Joseph as a slave?", choices: ["Potiphar", "Pharaoh", "Pithom", "Zaphnath"], answer: "Potiphar", reference: "Genesis 39:1", category: "Character", difficulty: "medium" },
      { question: "Who was the mysterious priest-king of Salem who blessed Abram with bread and wine?", choices: ["Melchizedek", "Abimelech", "Chedorlaomer", "Methuselah"], answer: "Melchizedek", reference: "Genesis 14:18", category: "Character", difficulty: "expert" }
    ],
    animals: [
      { question: "What creature tempted Eve to eat the forbidden fruit?", choices: ["The serpent", "A lion", "A raven", "A lamb"], answer: "The serpent", reference: "Genesis 3:1", category: "Animals", difficulty: "easy" },
      { question: "What animal was cursed to crawl on its belly after deceiving Eve?", choices: ["The serpent", "The wolf", "The fox", "The toad"], answer: "The serpent", reference: "Genesis 3:14", category: "Animals", difficulty: "easy" },
      { question: "How many pairs of unclean animals did Noah bring onto the ark?", choices: ["Seven pairs", "Two pairs", "One pair", "Three pairs"], answer: "One pair", reference: "Genesis 7:2", category: "Animals", difficulty: "medium" },
      { question: "How many pairs of clean animals did Noah bring onto the ark?", choices: ["One pair", "Seven pairs", "Two pairs", "Twelve pairs"], answer: "Seven pairs", reference: "Genesis 7:2", category: "Animals", difficulty: "medium" },
      { question: "What bird did Noah release first after the rain stopped, which never returned?", choices: ["A dove", "A raven", "An eagle", "A sparrow"], answer: "A raven", reference: "Genesis 8:7", category: "Animals", difficulty: "medium" },
      { question: "What bird did Noah send out that came back with an olive leaf?", choices: ["A dove", "A raven", "A hawk", "A swallow"], answer: "A dove", reference: "Genesis 8:11", category: "Animals", difficulty: "easy" },
      { question: "What animal did God provide to Abraham as a substitute sacrifice for Isaac?", choices: ["A ram", "A bull", "A goat", "A lamb"], answer: "A ram", reference: "Genesis 22:13", category: "Animals", difficulty: "medium" },
      { question: "Along with a heifer, a goat, and a ram, what bird did Abraham offer in his covenant sacrifice with God?", choices: ["A raven", "A dove", "An eagle", "A sparrow"], answer: "A dove", reference: "Genesis 15:9", category: "Animals", difficulty: "hard" },
      { question: "What animals did Jacob prepare to disguise as Esau's hunted game for Isaac's blessing?", choices: ["Young goats", "Lambs", "Calves", "Pigeons"], answer: "Young goats", reference: "Genesis 27:9", category: "Animals", difficulty: "hard" },
      { question: "What animal skins did Jacob put on his hands and neck to feel hairy like Esau?", choices: ["Sheep skins", "Goat skins", "Camel hides", "Lion skins"], answer: "Goat skins", reference: "Genesis 27:16", category: "Animals", difficulty: "hard" },
      { question: "What animal did Jacob's sons kill to dip Joseph's robe in blood?", choices: ["A lamb", "A bull", "A goat", "A ram"], answer: "A goat", reference: "Genesis 37:31", category: "Animals", difficulty: "medium" },
      { question: "In Pharaoh's dream, what animals came up from the Nile representing years of plenty and famine?", choices: ["Cows", "Sheep", "Locusts", "Frogs"], answer: "Cows", reference: "Genesis 41:1-4", category: "Animals", difficulty: "easy" },
      { question: "What animal did Rebekah ride when she first traveled to meet Isaac?", choices: ["A donkey", "A camel", "A horse", "An ox"], answer: "A camel", reference: "Genesis 24:64", category: "Animals", difficulty: "medium" },
      { question: "What animals did Abraham's servant water at the well when he met Rebekah?", choices: ["Camels", "Sheep", "Donkeys", "Goats"], answer: "Camels", reference: "Genesis 24:11", category: "Animals", difficulty: "medium" },
      { question: "What kind of livestock helped make Abraham extremely wealthy, alongside silver and gold?", choices: ["Cattle", "Horses", "Pigs", "Doves"], answer: "Cattle", reference: "Genesis 13:2", category: "Animals", difficulty: "medium" },
      { question: "Through Jacob's trick with peeled branches at the watering troughs, what animals bore streaked and spotted offspring?", choices: ["Sheep", "Goats", "Camels", "Donkeys"], answer: "Goats", reference: "Genesis 30:37-39", category: "Animals", difficulty: "expert" },
      { question: "In Jacob's final blessing, what animal is Judah compared to?", choices: ["A lion", "A wolf", "A serpent", "A bear"], answer: "A lion", reference: "Genesis 49:9", category: "Animals", difficulty: "hard" },
      { question: "In Jacob's final blessing, what animal is Issachar compared to?", choices: ["A donkey", "A horse", "An ox", "A camel"], answer: "A donkey", reference: "Genesis 49:14", category: "Animals", difficulty: "expert" },
      { question: "In Jacob's final blessing, what animal is Dan compared to?", choices: ["A lion", "A serpent", "A wolf", "A lamb"], answer: "A serpent", reference: "Genesis 49:17", category: "Animals", difficulty: "expert" },
      { question: "In Jacob's final blessing, what animal is Naphtali compared to?", choices: ["A doe", "A wolf", "A lion", "A ram"], answer: "A doe", reference: "Genesis 49:21", category: "Animals", difficulty: "expert" },
      { question: "In Jacob's final blessing, what animal is Benjamin compared to?", choices: ["A lamb", "A wolf", "A dove", "A fox"], answer: "A wolf", reference: "Genesis 49:27", category: "Animals", difficulty: "expert" },
      { question: "What flocks did Jacob tend for many years in exchange for wages from Laban?", choices: ["Sheep and goats", "Cattle and oxen", "Camels and donkeys", "Doves and pigeons"], answer: "Sheep and goats", reference: "Genesis 30:31-32", category: "Animals", difficulty: "medium" },
      { question: "What flying creatures did God create on the fifth day, along with sea creatures?", choices: ["Birds", "Insects", "Bats", "Reptiles"], answer: "Birds", reference: "Genesis 1:20-21", category: "Animals", difficulty: "medium" }
    ],
    things: [
      { question: "What did God place at the entrance of Eden, along with cherubim, to guard the way back?", choices: ["A flaming sword", "A stone wall", "A bronze gate", "A thorned hedge"], answer: "A flaming sword", reference: "Genesis 3:24", category: "Things", difficulty: "hard" },
      { question: "What material did Noah use to seal the ark and make it watertight?", choices: ["Pitch (tar)", "Clay", "Wax", "Oil"], answer: "Pitch (tar)", reference: "Genesis 6:14", category: "Things", difficulty: "medium" },
      { question: "What did God set in the sky as a sign of His covenant never to flood the earth again?", choices: ["A rainbow", "A comet", "A new star", "A cloud pillar"], answer: "A rainbow", reference: "Genesis 9:13", category: "Things", difficulty: "easy" },
      { question: "What did Jacob use as a pillow the night he dreamed of a stairway to heaven?", choices: ["A stone", "A bundle of cloth", "A wooden plank", "His cloak"], answer: "A stone", reference: "Genesis 28:11", category: "Things", difficulty: "medium" },
      { question: "What did Jacob see in his dream connecting heaven and earth at Bethel?", choices: ["A stairway to heaven", "A flaming chariot", "A great river", "A golden throne"], answer: "A stairway to heaven", reference: "Genesis 28:12", category: "Things", difficulty: "easy" },
      { question: "What special garment did Jacob give Joseph that made his brothers jealous?", choices: ["A richly ornamented robe", "A bronze helmet", "A linen turban", "A golden belt"], answer: "A richly ornamented robe", reference: "Genesis 37:3", category: "Things", difficulty: "easy" },
      { question: "What did Joseph's brothers throw him into before selling him to traders?", choices: ["A pit", "A river", "A cave", "A well of water"], answer: "A pit", reference: "Genesis 37:24", category: "Things", difficulty: "medium" },
      { question: "What did Pharaoh give Joseph as a symbol of his new authority over Egypt?", choices: ["A signet ring", "A golden crown", "A jeweled scepter", "A ceremonial sword"], answer: "A signet ring", reference: "Genesis 41:42", category: "Things", difficulty: "medium" },
      { question: "What did Joseph have hidden in Benjamin's sack to test his brothers?", choices: ["A silver cup", "A gold coin", "A jeweled ring", "A bronze dagger"], answer: "A silver cup", reference: "Genesis 44:2", category: "Things", difficulty: "medium" },
      { question: "What did Esau trade his birthright for?", choices: ["A bowl of stew", "A flock of sheep", "A tent", "A bag of silver"], answer: "A bowl of stew", reference: "Genesis 25:34", category: "Things", difficulty: "easy" },
      { question: "What gold jewelry did Abraham's servant give Rebekah at the well?", choices: ["A nose ring and bracelets", "A necklace and crown", "Earrings and a belt", "A ring and anklets"], answer: "A nose ring and bracelets", reference: "Genesis 24:22", category: "Things", difficulty: "hard" },
      { question: "What did God tell Abraham to count to illustrate how numerous his descendants would be?", choices: ["The stars", "Grains of sand", "Drops of rain", "Blades of grass"], answer: "The stars", reference: "Genesis 15:5", category: "Things", difficulty: "medium" },
      { question: "What did Jacob wrestle with all night at Peniel?", choices: ["A man", "A lion", "A giant", "A serpent"], answer: "A man", reference: "Genesis 32:24", category: "Things", difficulty: "medium" },
      { question: "What did Lot's wife turn into when she disobeyed and looked back at Sodom?", choices: ["A pillar of salt", "A block of stone", "A pillar of fire", "A tree"], answer: "A pillar of salt", reference: "Genesis 19:26", category: "Things", difficulty: "easy" },
      { question: "What did Abraham carry in his hand to sacrifice Isaac before the angel stopped him?", choices: ["A knife", "A sword", "A torch", "A staff"], answer: "A knife", reference: "Genesis 22:10", category: "Things", difficulty: "medium" },
      { question: "What crop filled Egypt's storehouses during the seven years of plenty under Joseph's administration?", choices: ["Grain", "Olives", "Wine", "Wool"], answer: "Grain", reference: "Genesis 41:49", category: "Things", difficulty: "easy" },
      { question: "What did Jacob set up and anoint with oil as a memorial at Bethel?", choices: ["A stone pillar", "A wooden altar", "A bronze statue", "A tent shrine"], answer: "A stone pillar", reference: "Genesis 28:18", category: "Things", difficulty: "medium" },
      { question: "What did Rachel secretly take from her father Laban's house before fleeing with Jacob?", choices: ["His household gods", "His silver coins", "His seal and signet", "His written records"], answer: "His household gods", reference: "Genesis 31:19", category: "Things", difficulty: "hard" },
      { question: "What did Abraham purchase from the Hittites as a burial place for Sarah?", choices: ["The cave of Machpelah", "A garden tomb", "A hillside vineyard", "A walled orchard"], answer: "The cave of Machpelah", reference: "Genesis 23:17-19", category: "Things", difficulty: "hard" },
      { question: "What covenant sign did God command for Abraham and every male in his household?", choices: ["Circumcision", "A blood mark on the doorpost", "A white robe", "A shaved head"], answer: "Circumcision", reference: "Genesis 17:10-11", category: "Things", difficulty: "medium" }
    ],
    places: [
      { question: "What was the name of the garden where God placed Adam and Eve?", choices: ["The Garden of Eden", "The Vale of Siddim", "The Plain of Shinar", "The Garden of Gethsemane"], answer: "The Garden of Eden", reference: "Genesis 2:8", category: "Places", difficulty: "easy" },
      { question: "On what mountain did Noah's ark come to rest after the flood?", choices: ["Mount Ararat", "Mount Sinai", "Mount Moriah", "Mount Carmel"], answer: "Mount Ararat", reference: "Genesis 8:4", category: "Places", difficulty: "medium" },
      { question: "What tower did people build to reach the heavens, prompting God to scatter them and confuse their languages?", choices: ["The Tower of Babel", "The Tower of Siloam", "The Tower of Babylon", "The Ziggurat of Ur"], answer: "The Tower of Babel", reference: "Genesis 11:4-9", category: "Places", difficulty: "easy" },
      { question: "What two cities did God destroy with fire and burning sulfur for their wickedness?", choices: ["Sodom and Gomorrah", "Nineveh and Tyre", "Jericho and Ai", "Babylon and Nineveh"], answer: "Sodom and Gomorrah", reference: "Genesis 19:24", category: "Places", difficulty: "easy" },
      { question: "What land did God call Abram to travel to, promising it to his descendants?", choices: ["Canaan", "Moab", "Edom", "Aram"], answer: "Canaan", reference: "Genesis 12:5", category: "Places", difficulty: "medium" },
      { question: "What city did Abram's family originally come from, in the territory of the Chaldeans?", choices: ["Ur", "Haran", "Nineveh", "Babylon"], answer: "Ur", reference: "Genesis 11:28", category: "Places", difficulty: "hard" },
      { question: "What city did Abram's family settle in before he was called onward to Canaan?", choices: ["Haran", "Shechem", "Bethel", "Damascus"], answer: "Haran", reference: "Genesis 11:31", category: "Places", difficulty: "medium" },
      { question: "Where did Jacob dream of a stairway to heaven and later set up a memorial stone?", choices: ["Bethel", "Peniel", "Gilead", "Shechem"], answer: "Bethel", reference: "Genesis 28:19", category: "Places", difficulty: "medium" },
      { question: "Where did Jacob wrestle with God and receive the name Israel?", choices: ["Peniel", "Bethel", "Mahanaim", "Succoth"], answer: "Peniel", reference: "Genesis 32:30", category: "Places", difficulty: "hard" },
      { question: "Where was Joseph taken and sold as a slave, later rising to become a powerful ruler?", choices: ["Egypt", "Moab", "Aram", "Edom"], answer: "Egypt", reference: "Genesis 37:36", category: "Places", difficulty: "easy" },
      { question: "Near what oaks/trees did Abraham settle and build an altar after leaving Haran?", choices: ["The oaks of Mamre", "The cedars of Lebanon", "The oaks of Bashan", "The terebinths of Moreh"], answer: "The oaks of Mamre", reference: "Genesis 13:18", category: "Places", difficulty: "hard" },
      { question: "What city did Lot choose to live near after separating from Abram?", choices: ["Sodom", "Hebron", "Shechem", "Beersheba"], answer: "Sodom", reference: "Genesis 13:12", category: "Places", difficulty: "medium" },
      { question: "On what mountain did Abraham nearly sacrifice his son Isaac?", choices: ["Mount Moriah", "Mount Ararat", "Mount Sinai", "Mount Nebo"], answer: "Mount Moriah", reference: "Genesis 22:2", category: "Places", difficulty: "medium" },
      { question: "What fertile region in Egypt did Pharaoh give to Jacob's family to live in during the famine?", choices: ["Goshen", "Memphis", "Pithom", "Zoan"], answer: "Goshen", reference: "Genesis 47:6", category: "Places", difficulty: "hard" },
      { question: "Near what town was Rachel buried, according to Genesis?", choices: ["Bethlehem", "Hebron", "Bethel", "Beersheba"], answer: "Bethlehem", reference: "Genesis 35:19", category: "Places", difficulty: "expert" },
      { question: "What cave did Abraham buy from the Hittites as a family burial site?", choices: ["Machpelah", "Adullam", "Engedi", "Makkedah"], answer: "Machpelah", reference: "Genesis 23:19", category: "Places", difficulty: "hard" },
      { question: "What region did Esau settle in after Jacob received their father's blessing?", choices: ["Seir", "Moab", "Midian", "Bashan"], answer: "Seir", reference: "Genesis 36:8", category: "Places", difficulty: "hard" },
      { question: "Abraham's servant traveled to the city of which relative of Abraham to find a wife for Isaac?", choices: ["Nahor", "Haran", "Laban", "Bethuel"], answer: "Nahor", reference: "Genesis 24:10", category: "Places", difficulty: "expert" }
    ],
    events: [
      { question: "What catastrophic event did God send to wipe out nearly all life because of human wickedness?", choices: ["The Flood", "A great famine", "A plague of locusts", "An earthquake"], answer: "The Flood", reference: "Genesis 6-8", category: "Events", difficulty: "easy" },
      { question: "What act led to Adam and Eve being expelled from the Garden of Eden?", choices: ["Eating the forbidden fruit", "Building an altar", "Naming the animals", "Sleeping past sunset"], answer: "Eating the forbidden fruit", reference: "Genesis 3:6,23-24", category: "Events", difficulty: "easy" },
      { question: "What sign of the covenant did God establish for Abraham and his male descendants?", choices: ["Circumcision", "A daily sacrifice", "A weekly fast", "Wearing special garments"], answer: "Circumcision", reference: "Genesis 17:10-11", category: "Events", difficulty: "medium" },
      { question: "What event on Mount Moriah tested Abraham's faith and obedience?", choices: ["The binding of Isaac", "The blessing of Jacob", "The covenant of the pieces", "The burning bush"], answer: "The binding of Isaac", reference: "Genesis 22", category: "Events", difficulty: "medium" },
      { question: "What event caused humanity's languages to be confused and people scattered across the earth?", choices: ["The Tower of Babel", "The Flood", "The Exodus", "The fall of Sodom"], answer: "The Tower of Babel", reference: "Genesis 11:1-9", category: "Events", difficulty: "easy" },
      { question: "What deception allowed Jacob to receive the blessing Isaac intended for Esau?", choices: ["Jacob disguising himself as Esau", "Jacob bribing Isaac's servants", "Rebekah hiding Esau away", "Jacob trading his birthright"], answer: "Jacob disguising himself as Esau", reference: "Genesis 27", category: "Events", difficulty: "medium" },
      { question: "What false accusation led to Joseph being thrown into an Egyptian prison?", choices: ["Potiphar's wife's accusation", "Stealing from Pharaoh's treasury", "Plotting with Pharaoh's enemies", "Insulting Potiphar publicly"], answer: "Potiphar's wife's accusation", reference: "Genesis 39:17-20", category: "Events", difficulty: "medium" },
      { question: "What event brought Joseph's brothers to Egypt, where they unknowingly bowed before him?", choices: ["Coming to buy grain during the famine", "Searching for their father's runaway flocks", "Fleeing a war in Canaan", "Seeking refuge from drought in Moab"], answer: "Coming to buy grain during the famine", reference: "Genesis 42", category: "Events", difficulty: "medium" },
      { question: "What event led to Jacob receiving the new name Israel?", choices: ["Wrestling with God at Peniel", "Defeating Esau in battle", "Building an altar at Bethel", "Surviving the flood"], answer: "Wrestling with God at Peniel", reference: "Genesis 32:24-28", category: "Events", difficulty: "medium" },
      { question: "What event led to Joseph being separated from his family and taken to Egypt?", choices: ["His brothers selling him to traders", "Being kidnapped by Egyptian soldiers", "Running away after a family argument", "Being sent to study in Egypt"], answer: "His brothers selling him to traders", reference: "Genesis 37:28", category: "Events", difficulty: "easy" },
      { question: "What dream did Joseph interpret for Pharaoh, predicting seven years of plenty and famine?", choices: ["Seven fat cows and seven lean cows", "Seven golden lampstands", "Seven baskets of bread", "Seven stars falling from the sky"], answer: "Seven fat cows and seven lean cows", reference: "Genesis 41:1-4", category: "Events", difficulty: "medium" },
      { question: "What disaster destroyed the cities of Sodom and Gomorrah?", choices: ["Fire and burning sulfur from the sky", "A massive flood", "An earthquake", "A siege by enemy kings"], answer: "Fire and burning sulfur from the sky", reference: "Genesis 19:24", category: "Events", difficulty: "easy" },
      { question: "What promise did God make to Abraham while pointing to the night sky?", choices: ["That his descendants would be as numerous as the stars", "That he would live forever", "That he would rule over Egypt", "That his land would never flood"], answer: "That his descendants would be as numerous as the stars", reference: "Genesis 15:5", category: "Events", difficulty: "medium" },
      { question: "What caused Lot's wife to be turned into a pillar of salt?", choices: ["Looking back at the destruction of Sodom", "Refusing to leave her home", "Doubting the angel's warning", "Returning to gather her belongings"], answer: "Looking back at the destruction of Sodom", reference: "Genesis 19:26", category: "Events", difficulty: "easy" },
      { question: "What emotional event happened after 22 years of separation between Jacob and his favorite son?", choices: ["Jacob's reunion with Joseph in Egypt", "Jacob's reconciliation with Esau", "Jacob's wedding to Rachel", "Jacob's return to Bethel"], answer: "Jacob's reunion with Joseph in Egypt", reference: "Genesis 46:29", category: "Events", difficulty: "medium" },
      { question: "What plan did Joseph devise to prepare Egypt for the coming famine?", choices: ["Storing surplus grain during the years of plenty", "Building new irrigation canals", "Taxing neighboring nations", "Trading grain for gold with Canaan"], answer: "Storing surplus grain during the years of plenty", reference: "Genesis 41:46-49", category: "Events", difficulty: "medium" },
      { question: "What did God create on the very first day of creation, according to Genesis?", choices: ["Light", "The sun and moon", "Land animals", "The seas"], answer: "Light", reference: "Genesis 1:3", category: "Events", difficulty: "easy" },
      { question: "On which day did God rest after completing the work of creation?", choices: ["The seventh day", "The sixth day", "The third day", "The first day"], answer: "The seventh day", reference: "Genesis 2:2", category: "Events", difficulty: "easy" },
      { question: "What test did Joseph devise involving Benjamin to see if his brothers had changed?", choices: ["Hiding a silver cup in Benjamin's sack", "Demanding Benjamin be sold as a slave", "Accusing Benjamin of theft in public", "Sending Benjamin away alone"], answer: "Hiding a silver cup in Benjamin's sack", reference: "Genesis 44", category: "Events", difficulty: "hard" },
      { question: "What covenant ceremony did God perform with Abraham involving a smoking firepot and blazing torch passing between sacrificial pieces?", choices: ["The covenant of the pieces", "The covenant of circumcision", "The Sinai covenant", "The rainbow covenant"], answer: "The covenant of the pieces", reference: "Genesis 15:17", category: "Events", difficulty: "expert" }
    ]
  }
};

const BookQuestions = (function () {
  function getPool(book, category, difficulty) {
    const byBook = BOOK_QUESTION_DB[book];
    const all = (byBook && byBook[category]) || [];
    if (!difficulty || difficulty === 'any') return all;
    return all.filter(q => q.difficulty === difficulty);
  }

  function getCount(book, category, difficulty) {
    return getPool(book, category, difficulty).length;
  }

  return {
    BIBLE_BOOKS,
    ANSWER_CATEGORIES,
    getPool,
    getCount
  };
})();
