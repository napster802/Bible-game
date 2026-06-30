<?php
// Bible Scrabble – server-side word list, scoring, and placement validation.
// Client mirror: js/scrabble_words.js (word list only; logic stays server-side).

/* ------------------------------------------------------------------ */
/*  Letter point values                                                 */
/* ------------------------------------------------------------------ */
const SCRAB_LETTER_VALUES = [
    'A' => 1, 'B' => 3, 'C' => 3, 'D' => 2, 'E' => 1, 'F' => 4,
    'G' => 2, 'H' => 4, 'I' => 1, 'J' => 5, 'K' => 5, 'L' => 1,
    'M' => 3, 'N' => 1, 'O' => 1, 'P' => 3, 'Q' => 10, 'R' => 1,
    'S' => 1, 'T' => 1, 'U' => 1, 'V' => 4, 'W' => 4, 'X' => 8,
    'Y' => 4, 'Z' => 10, '' => 0,
];

/* ------------------------------------------------------------------ */
/*  Initial 100-tile bag (letter → count)                              */
/*  Scaled up from 70 to support 8 players (8×7=56 dealt, 44 remain)  */
/* ------------------------------------------------------------------ */
const SCRAB_BAG_DIST = [
    'A' => 9, 'B' => 2, 'C' => 2, 'D' => 4, 'E' => 9, 'F' => 2,
    'G' => 2, 'H' => 4, 'I' => 7, 'J' => 2, 'K' => 2, 'L' => 4,
    'M' => 3, 'N' => 6, 'O' => 6, 'P' => 3, 'Q' => 1, 'R' => 6,
    'S' => 6, 'T' => 6, 'U' => 3, 'V' => 2, 'W' => 2, 'X' => 1,
    'Y' => 3, '' => 3, // blank
];

/* ------------------------------------------------------------------ */
/*  11×11 Premium grid (row-major, 121 cells)                          */
/*  tw = Triple Word (Covenant Square)   dw = Double Word (Prophet)    */
/*  tl = Triple Letter (Scroll Square)   dl = Double Letter (Lamp)     */
/*  star = center start (first word ×2)                                */
/* ------------------------------------------------------------------ */
const SCRAB_PREMIUM_GRID = [
// Col: 0     1     2     3     4      5      6     7     8     9     10
  'tw', '',   '',  'dl',  '',   'dl',  '',   'dl',  '',   '',  'tw', // Row 0
   '',  'dw', '',   '',  'tl',  '',   'tl',  '',   '',  'dw',  '',  // Row 1
   '',  '',  'dw',  '',   '',   '',    '',   '',   'dw', '',   '',   // Row 2
  'dl', '',   '',  'dw',  '',  'dl',   '',  'dw',  '',   '',  'dl', // Row 3
   '',  'tl', '',   '',   '',   '',    '',   '',   '',  'tl',  '',  // Row 4
  'dl', '',   '',  'dl',  '',  'star', '',  'dl',  '',   '',  'dl', // Row 5
   '',  'tl', '',   '',   '',   '',    '',   '',   '',  'tl',  '',  // Row 6
  'dl', '',   '',  'dw',  '',  'dl',   '',  'dw',  '',   '',  'dl', // Row 7
   '',  '',  'dw',  '',   '',   '',    '',   '',  'dw',  '',   '',  // Row 8
   '',  'dw', '',   '',  'tl',  '',   'tl',  '',   '',  'dw',  '',  // Row 9
  'tw', '',   '',  'dl',  '',  'dl',   '',  'dl',  '',   '',  'tw', // Row 10
];

/* ------------------------------------------------------------------ */
/*  Bible word list (~500 words)                                        */
/*  Format: ['WORD', 'category', 'short note']                         */
/*  cat: book | character | place | concept | object | animal          */
/* ------------------------------------------------------------------ */
const SCRAB_WORDS = [
    // === BOOKS OF THE BIBLE ===
    ['GENESIS',      'book', 'First book of the Bible'],
    ['EXODUS',       'book', 'Israel leaves Egypt (Exodus)'],
    ['LEVITICUS',    'book', 'Laws for the Levites'],
    ['NUMBERS',      'book', 'Census of Israel in the wilderness'],
    ['DEUTERONOMY',  'book', 'Moses repeats the Law'],
    ['JOSHUA',       'book', 'Israel conquers Canaan'],
    ['JUDGES',       'book', 'Israel cycles between sin and deliverance'],
    ['RUTH',         'book', 'Loyalty and redemption in Moab'],
    ['SAMUEL',       'book', 'Rise of Israel\'s first kings'],
    ['KINGS',        'book', 'History of Israel\'s monarchs'],
    ['CHRONICLES',   'book', 'Temple worship and royal genealogies'],
    ['EZRA',         'book', 'Return from Babylonian exile'],
    ['NEHEMIAH',     'book', 'Rebuilding Jerusalem\'s walls'],
    ['ESTHER',       'book', 'Queen Esther saves her people'],
    ['JOB',          'book', 'Suffering and faith tested'],
    ['PSALMS',       'book', '150 songs and prayers'],
    ['PROVERBS',     'book', 'Wisdom sayings of Solomon'],
    ['ISAIAH',       'book', 'Prophecies of the Messiah'],
    ['JEREMIAH',     'book', 'Weeping prophet of Jerusalem'],
    ['EZEKIEL',      'book', 'Visions of God\'s glory'],
    ['DANIEL',       'book', 'Faithful in Babylon'],
    ['HOSEA',        'book', 'God\'s love for unfaithful Israel'],
    ['JOEL',         'book', 'Locust plague and the Day of the Lord'],
    ['AMOS',         'book', 'Shepherd prophet of justice'],
    ['OBADIAH',      'book', 'Shortest Old Testament book'],
    ['JONAH',        'book', 'Prophet swallowed by a great fish'],
    ['MICAH',        'book', 'Bethlehem foretold as Messiah\'s birthplace'],
    ['NAHUM',        'book', 'Nineveh\'s destruction foretold'],
    ['HABAKKUK',     'book', 'Questions God\'s justice'],
    ['ZEPHANIAH',    'book', 'The Day of the Lord'],
    ['HAGGAI',       'book', 'Rebuild the Temple'],
    ['ZECHARIAH',    'book', 'Visions and Messianic prophecy'],
    ['MALACHI',      'book', 'Last Old Testament prophet'],
    ['MATTHEW',      'book', 'Gospel for Jewish readers'],
    ['MARK',         'book', 'Shortest and fastest Gospel'],
    ['LUKE',         'book', 'Gospel for Gentiles'],
    ['JOHN',         'book', 'Gospel of love and eternal life'],
    ['ACTS',         'book', 'Birth and spread of the early Church'],
    ['ROMANS',       'book', 'Justification by faith'],
    ['CORINTHIANS',  'book', 'Paul\'s letters to Corinth'],
    ['GALATIANS',    'book', 'Freedom from the Law'],
    ['EPHESIANS',    'book', 'Unity in Christ\'s body'],
    ['PHILIPPIANS',  'book', 'Joy even in prison'],
    ['COLOSSIANS',   'book', 'Supremacy of Christ'],
    ['TIMOTHY',      'book', 'Letters to a young pastor'],
    ['TITUS',        'book', 'Instructions for church order'],
    ['PHILEMON',     'book', 'Onesimus the runaway slave'],
    ['HEBREWS',      'book', 'Jesus as the great High Priest'],
    ['JAMES',        'book', 'Faith without works is dead'],
    ['PETER',        'book', 'Letters to scattered believers'],
    ['JUDE',         'book', 'Contend for the faith'],
    ['REVELATION',   'book', 'Apocalyptic vision of the end times'],
    // === BIBLE CHARACTERS ===
    ['ADAM',         'character', 'First man, formed from dust (Genesis)'],
    ['EVE',          'character', 'First woman, made from Adam\'s rib'],
    ['CAIN',         'character', 'First murderer, killed his brother Abel'],
    ['ABEL',         'character', 'First martyr, killed by Cain'],
    ['SETH',         'character', 'Third son of Adam and Eve'],
    ['ENOCH',        'character', 'Walked with God and was taken up'],
    ['NOAH',         'character', 'Built the ark and survived the flood'],
    ['SHEM',         'character', 'Son of Noah, ancestor of Abraham'],
    ['HAM',          'character', 'Son of Noah, ancestor of Canaan'],
    ['JAPHETH',      'character', 'Son of Noah, ancestor of the nations'],
    ['ABRAHAM',      'character', 'Father of faith, called from Ur'],
    ['SARAH',        'character', 'Wife of Abraham, mother of Isaac'],
    ['HAGAR',        'character', 'Egyptian servant, mother of Ishmael'],
    ['ISHMAEL',      'character', 'Son of Abraham and Hagar'],
    ['ISAAC',        'character', 'Son of promise, nearly sacrificed'],
    ['REBEKAH',      'character', 'Wife of Isaac, mother of Jacob'],
    ['JACOB',        'character', 'Wrestled with God and became Israel'],
    ['ESAU',         'character', 'Jacob\'s twin, sold his birthright'],
    ['RACHEL',       'character', 'Jacob\'s beloved wife, mother of Joseph'],
    ['LEAH',         'character', 'Jacob\'s first wife, mother of Judah'],
    ['JOSEPH',       'character', 'Sold into slavery, rose to rule Egypt'],
    ['JUDAH',        'character', 'Lion of Judah, ancestor of David'],
    ['LEVI',         'character', 'Ancestor of the priestly tribe'],
    ['REUBEN',       'character', 'Jacob\'s firstborn son'],
    ['SIMEON',       'character', 'Second son of Jacob and Leah'],
    ['BENJAMIN',     'character', 'Youngest son of Jacob and Rachel'],
    ['DAN',          'character', 'Sixth son of Jacob'],
    ['GAD',          'character', 'Seventh son of Jacob'],
    ['ASHER',        'character', 'Eighth son of Jacob'],
    ['ISSACHAR',     'character', 'Ninth son of Jacob'],
    ['ZEBULUN',      'character', 'Tenth son of Jacob'],
    ['NAPHTALI',     'character', 'Sixth son of Jacob'],
    ['MOSES',        'character', 'Led Israel out of Egypt (Exodus)'],
    ['AARON',        'character', 'First high priest, brother of Moses'],
    ['MIRIAM',       'character', 'Sister of Moses, led worship after the Red Sea'],
    ['CALEB',        'character', 'Faithfully spied out the Promised Land'],
    ['RAHAB',        'character', 'Prostitute who hid the spies in Jericho'],
    ['DEBORAH',      'character', 'Prophetess and judge of Israel'],
    ['GIDEON',       'character', 'Led 300 warriors against Midian'],
    ['SAMSON',       'character', 'Nazirite judge with supernatural strength'],
    ['DELILAH',      'character', 'Cut Samson\'s hair and betrayed him'],
    ['RUTH',         'character', 'Loyal Moabite, ancestor of David'],
    ['NAOMI',        'character', 'Ruth\'s mother-in-law'],
    ['BOAZ',         'character', 'Kinsman-redeemer who married Ruth'],
    ['ELI',          'character', 'Priest at Shiloh, Samuel\'s mentor'],
    ['HANNAH',       'character', 'Prayed for a son and gave Samuel to God'],
    ['SAMUEL',       'character', 'Last judge and first prophet of Israel'],
    ['SAUL',         'character', 'First king of Israel'],
    ['DAVID',        'character', 'King after God\'s own heart'],
    ['GOLIATH',      'character', 'Philistine giant slain by David'],
    ['JONATHAN',     'character', 'David\'s closest friend, Saul\'s son'],
    ['ABIGAIL',      'character', 'Wise woman who became David\'s wife'],
    ['BATHSHEBA',    'character', 'Mother of Solomon, wife of David'],
    ['JOAB',         'character', 'Commander of David\'s army'],
    ['ABSALOM',      'character', 'David\'s rebellious son'],
    ['SOLOMON',      'character', 'Wisest king, built the first Temple'],
    ['REHOBOAM',     'character', 'Solomon\'s son, kingdom was divided'],
    ['JEROBOAM',     'character', 'First king of the northern kingdom'],
    ['AHAB',         'character', 'Wicked king of Israel who married Jezebel'],
    ['JEZEBEL',      'character', 'Wicked queen who persecuted Elijah'],
    ['ELIJAH',       'character', 'Prophet taken to heaven in a chariot of fire'],
    ['ELISHA',       'character', 'Elijah\'s successor with double his spirit'],
    ['NAAMAN',       'character', 'Syrian general healed of leprosy by Elisha'],
    ['HEZEKIAH',     'character', 'King who trusted God against Assyria'],
    ['MANASSEH',     'character', 'Wicked king who later repented'],
    ['JOSIAH',       'character', 'King who renewed the covenant with God'],
    ['ZEDEKIAH',     'character', 'Last king of Judah before Babylon'],
    ['ISAIAH',       'character', 'Prophet who foretold the virgin birth'],
    ['JEREMIAH',     'character', 'Weeping prophet who warned of exile'],
    ['EZEKIEL',      'character', 'Prophet of the valley of dry bones'],
    ['DANIEL',       'character', 'Survived the lion\'s den in Babylon'],
    ['SHADRACH',     'character', 'Survived the fiery furnace'],
    ['MESHACH',      'character', 'Survived the fiery furnace with Shadrach'],
    ['NEHEMIAH',     'character', 'Rebuilt Jerusalem\'s walls in 52 days'],
    ['EZRA',         'character', 'Scribe who taught the Law after exile'],
    ['ESTHER',       'character', 'Queen who saved the Jews from Haman'],
    ['MORDECAI',     'character', 'Esther\'s cousin who uncovered the plot'],
    ['HAMAN',        'character', 'Plotted to destroy all Jews in Persia'],
    ['VASHTI',       'character', 'Queen who refused to appear before Xerxes'],
    ['CYRUS',        'character', 'Persian king who freed the Jewish exiles'],
    ['BELSHAZZAR',   'character', 'King who saw writing on the wall'],
    ['ZERUBBABEL',   'character', 'Led the first return from Babylon'],
    ['METHUSELAH',   'character', 'Oldest man in the Bible (969 years)'],
    ['LAMECH',       'character', 'Father of Noah'],
    ['NIMROD',       'character', 'Mighty hunter before the LORD'],
    ['TERAH',        'character', 'Father of Abraham'],
    ['JOSEPH',       'character', 'Husband of Mary, earthly father of Jesus'],
    ['MARY',         'character', 'Mother of Jesus'],
    ['JESUS',        'character', 'Son of God, Savior of the world'],
    ['JOHN',         'character', 'The beloved disciple'],
    ['PETER',        'character', 'Rock on which Jesus built His church'],
    ['JAMES',        'character', 'Brother of John, first apostle martyred'],
    ['ANDREW',       'character', 'Peter\'s brother, first disciple called'],
    ['PHILIP',       'character', 'Asked Jesus to show them the Father'],
    ['THOMAS',       'character', 'Doubted until he saw Jesus\' wounds'],
    ['MATTHEW',      'character', 'Tax collector turned apostle'],
    ['JUDAS',        'character', 'Betrayed Jesus for 30 pieces of silver'],
    ['PAUL',         'character', 'Apostle to the Gentiles, wrote 13 epistles'],
    ['BARNABAS',     'character', 'Encouraged Paul on his first journey'],
    ['SILAS',        'character', 'Sang hymns with Paul in prison at Philippi'],
    ['TIMOTHY',      'character', 'Paul\'s son in the faith'],
    ['TITUS',        'character', 'Paul\'s delegate in Crete'],
    ['LUKE',         'character', 'Physician and historian of the early church'],
    ['MARK',         'character', 'Cousin of Barnabas, wrote the second Gospel'],
    ['STEPHEN',      'character', 'First Christian martyr, stoned to death'],
    ['LYDIA',        'character', 'First European convert, seller of purple'],
    ['PRISCILLA',    'character', 'Taught Apollos with her husband Aquila'],
    ['AQUILA',       'character', 'Tentmaker who worked with Paul'],
    ['APOLLOS',      'character', 'Eloquent preacher from Alexandria'],
    ['LAZARUS',      'character', 'Raised from the dead after four days'],
    ['MARTHA',       'character', 'Mary\'s practical sister in Bethany'],
    ['NICODEMUS',    'character', 'Came to Jesus by night to ask questions'],
    ['CORNELIUS',    'character', 'First Gentile convert, Roman centurion'],
    ['ZACCHAEUS',    'character', 'Short tax collector who climbed a sycamore tree'],
    ['BARTHOLOMEW',  'character', 'Apostle also known as Nathanael'],
    ['PILATE',       'character', 'Roman governor who sentenced Jesus'],
    ['HEROD',        'character', 'King who slaughtered the innocents at Bethlehem'],
    ['ZACHARIAS',    'character', 'Priest, father of John the Baptist'],
    ['ELIZABETH',    'character', 'Mother of John the Baptist'],
    ['SIMEON',       'character', 'Blessed the baby Jesus in the Temple'],
    ['ANNA',         'character', 'Prophetess who recognized the baby Jesus'],
    ['CAIAPHAS',     'character', 'High priest who condemned Jesus'],
    ['ANNAS',        'character', 'High priest who first questioned Jesus'],
    ['MALCHUS',      'character', 'Servant whose ear was cut off and healed'],
    ['ANANIAS',      'character', 'Struck dead for lying to the Holy Spirit'],
    ['SAPPHIRA',     'character', 'Ananias\'s wife, also struck dead for lying'],
    // === PLACES ===
    ['JERUSALEM',    'place', 'Holy city, city of David'],
    ['BETHLEHEM',    'place', 'City of David, birthplace of Jesus'],
    ['NAZARETH',     'place', 'Where Jesus grew up'],
    ['GALILEE',      'place', 'Region where Jesus did most of His miracles'],
    ['CANAAN',       'place', 'The Promised Land given to Abraham'],
    ['EGYPT',        'place', 'Where Israel was enslaved for 400 years'],
    ['SINAI',        'place', 'Mountain where God gave Moses the Law'],
    ['BABYLON',      'place', 'Where Israel was exiled for 70 years'],
    ['JERICHO',      'place', 'City whose walls fell at a shout'],
    ['JORDAN',       'place', 'River where Jesus was baptized'],
    ['CALVARY',      'place', 'Hill where Jesus was crucified'],
    ['BETHANY',      'place', 'Village of Mary, Martha, and Lazarus'],
    ['CAPERNAUM',    'place', 'Jesus\' base of operations in Galilee'],
    ['SAMARIA',      'place', 'Region between Judea and Galilee'],
    ['JUDEA',        'place', 'Southern region of Israel'],
    ['ISRAEL',       'place', 'The covenant nation descended from Jacob'],
    ['JUDAH',        'place', 'Southern kingdom after the division'],
    ['EPHRAIM',      'place', 'Territory of Joseph\'s second son'],
    ['DAMASCUS',     'place', 'Oldest capital city, Paul was converted near here'],
    ['ROME',         'place', 'Capital of the empire Paul wrote to'],
    ['ANTIOCH',      'place', 'Where believers were first called Christians'],
    ['CORINTH',      'place', 'Greek city where Paul planted a church'],
    ['ATHENS',       'place', 'Where Paul preached at the Areopagus'],
    ['CAESAREA',     'place', 'Roman capital of Judea'],
    ['EPHESUS',      'place', 'City of the great Temple of Artemis'],
    ['PHILIPPI',     'place', 'First European city Paul evangelized'],
    ['COLOSSAE',     'place', 'City in Asia Minor where Paul wrote from prison'],
    ['PATMOS',       'place', 'Island where John received Revelation'],
    ['TARSUS',       'place', 'Paul\'s home city in Cilicia'],
    ['NINEVEH',      'place', 'Assyrian capital where Jonah preached'],
    ['ASSYRIA',      'place', 'Empire that exiled the northern kingdom'],
    ['PERSIA',       'place', 'Empire of Cyrus, Darius, Xerxes, Esther'],
    ['ARABIA',       'place', 'Desert region south of Israel'],
    ['GOSHEN',       'place', 'Egyptian region where Israel lived during slavery'],
    ['MIDIAN',       'place', 'Desert where Moses fled and met God'],
    ['MOAB',         'place', 'Ruth\'s homeland east of the Dead Sea'],
    ['EDOM',         'place', 'Nation descended from Esau'],
    ['LEBANON',      'place', 'Source of cedar wood for Solomon\'s Temple'],
    ['HERMON',       'place', 'Possibly the mountain of Transfiguration'],
    ['CARMEL',       'place', 'Mountain where Elijah defeated the prophets of Baal'],
    ['ZION',         'place', 'Hill of Jerusalem, symbol of God\'s dwelling'],
    ['GOLGOTHA',     'place', 'Place of the Skull where Jesus was crucified'],
    ['EDEN',         'place', 'Garden where Adam and Eve lived before the fall'],
    ['ARARAT',       'place', 'Mountain where Noah\'s ark came to rest'],
    ['SHEBA',        'place', 'Queen who visited Solomon with hard questions'],
    ['TARSHISH',     'place', 'Far western city Jonah tried to flee to'],
    ['GILEAD',       'place', 'Mountainous region east of the Jordan'],
    ['GILGAL',       'place', 'First campsite in Canaan after the Jordan'],
    ['SHILOH',       'place', 'Where the Tabernacle was set up in Canaan'],
    ['BEERSHEBA',    'place', 'Southernmost city of Israel'],
    ['SHECHEM',      'place', 'Where Abraham built his first altar in Canaan'],
    ['HEBRON',       'place', 'City of Abraham; David\'s first capital'],
    ['BETHEL',       'place', 'Where Jacob saw the ladder to heaven'],
    ['MORIAH',       'place', 'Mountain where Abraham prepared to sacrifice Isaac'],
    ['MEGIDDO',      'place', 'Site of many battles; Armageddon'],
    ['JOPPA',        'place', 'Port where Jonah fled; where Peter raised Dorcas'],
    ['CYPRUS',       'place', 'Island homeland of Barnabas'],
    ['MALTA',        'place', 'Island where Paul was shipwrecked'],
    ['CRETE',        'place', 'Island where Titus served as pastor'],
    ['SILOAM',       'place', 'Pool where Jesus healed the blind man'],
    ['EMMAUS',       'place', 'Village where Jesus appeared after resurrection'],
    ['BETHSAIDA',    'place', 'Hometown of Peter, Andrew, and Philip'],
    ['PENIEL',       'place', 'Where Jacob wrestled with God all night'],
    ['GETHSEMANE',   'place', 'Garden where Jesus prayed before the cross'],
    ['HARRAN',       'place', 'City where Abraham\'s family stopped from Ur'],
    ['OPHIR',        'place', 'Source of finest gold for Solomon\'s Temple'],
    ['TIGRIS',       'place', 'One of the four rivers of Eden'],
    ['EUPHRATES',    'place', 'Great river of Mesopotamia'],
    ['PHILISTIA',    'place', 'Coastal territory of the Philistines'],
    ['GALATIA',      'place', 'Region of Paul\'s first missionary journey'],
    ['DECAPOLIS',    'place', 'League of ten Hellenistic cities'],
    ['UR',           'place', 'City of the Chaldeans where Abraham was born'],
    ['NILE',         'place', 'Great river of Egypt'],
    // === CONCEPTS ===
    ['GRACE',        'concept', 'Unmerited favor from God'],
    ['FAITH',        'concept', 'Trust in God and His promises'],
    ['LOVE',         'concept', 'Greatest commandment (1 Corinthians 13)'],
    ['HOPE',         'concept', 'Confident expectation in God\'s promises'],
    ['PEACE',        'concept', 'Shalom – wholeness and harmony'],
    ['MERCY',        'concept', 'Compassion and forgiveness for the undeserving'],
    ['TRUTH',        'concept', 'God\'s Word is truth (John 17:17)'],
    ['LIGHT',        'concept', 'Jesus is the light of the world'],
    ['SALVATION',    'concept', 'Deliverance from sin through Christ'],
    ['BAPTISM',      'concept', 'Symbolic burial and resurrection with Christ'],
    ['COVENANT',     'concept', 'Sacred binding agreement between God and people'],
    ['GOSPEL',       'concept', 'Good news of Jesus\' death and resurrection'],
    ['PROPHECY',     'concept', 'Speaking forth God\'s message or foretelling the future'],
    ['BLESSING',     'concept', 'Divine favor and goodness poured out'],
    ['WORSHIP',      'concept', 'Honoring and glorifying God'],
    ['REDEMPTION',   'concept', 'Being bought back from slavery to sin'],
    ['HOLINESS',     'concept', 'Being set apart and pure for God'],
    ['ATONEMENT',    'concept', 'Making amends for sin through sacrifice'],
    ['REPENTANCE',   'concept', 'Turning away from sin and toward God'],
    ['DISCIPLE',     'concept', 'Follower and student of Jesus'],
    ['APOSTLE',      'concept', 'One sent out with authority'],
    ['PROPHET',      'concept', 'One who speaks God\'s message'],
    ['PRIEST',       'concept', 'Mediator between God and the people'],
    ['KINGDOM',      'concept', 'God\'s rule and reign'],
    ['HEAVEN',       'concept', 'Dwelling place of God'],
    ['PARADISE',     'concept', 'The joyful presence of God after death'],
    ['HOLY',         'concept', 'Set apart as sacred to God'],
    ['SACRED',       'concept', 'Dedicated to God'],
    ['DIVINE',       'concept', 'Of or relating to God'],
    ['MIRACLE',      'concept', 'Supernatural act of God'],
    ['PARABLE',      'concept', 'Earthly story with a heavenly meaning'],
    ['SCRIPTURE',    'concept', 'The Holy Bible, God\'s written Word'],
    ['TABERNACLE',   'concept', 'Portable tent-sanctuary in the wilderness'],
    ['SACRIFICE',    'concept', 'Offering given to God'],
    ['OFFERING',     'concept', 'Gift presented to God'],
    ['TESTIMONY',    'concept', 'Personal account of God\'s work'],
    ['WISDOM',       'concept', 'Skill in living according to God\'s ways'],
    ['KNOWLEDGE',    'concept', 'Understanding of God and His creation'],
    ['SPIRIT',       'concept', 'The Holy Spirit, third person of the Trinity'],
    ['SOUL',         'concept', 'The eternal inner self'],
    ['AMEN',         'concept', 'So be it; truly'],
    ['SELAH',        'concept', 'Pause and reflect (used 71 times in Psalms)'],
    ['HALLELUJAH',   'concept', 'Praise the LORD (Hebrew)'],
    ['HOSANNA',      'concept', 'Save now! – cried at Jesus\' triumphal entry'],
    ['ALLELUIA',     'concept', 'Praise the LORD (Greek/Latin)'],
    ['SABBATH',      'concept', 'Day of rest commanded by God'],
    ['PASSOVER',     'concept', 'Memorial of Israel\'s deliverance from Egypt'],
    ['PENTECOST',    'concept', 'Day the Holy Spirit came on the disciples'],
    ['FORGIVENESS',  'concept', 'Canceling a debt; releasing from wrong'],
    ['COMMANDMENT',  'concept', 'Direct order from God'],
    ['INTERCEDE',    'concept', 'To pray on behalf of another'],
    ['RECONCILE',    'concept', 'Restore a broken relationship with God'],
    ['SANCTIFY',     'concept', 'To make holy and set apart for God'],
    ['REDEEM',       'concept', 'To buy back from bondage'],
    ['GLORIFY',      'concept', 'To honor and magnify God\'s greatness'],
    ['ATONE',        'concept', 'To make amends for sin'],
    ['TESTIFY',      'concept', 'To bear witness to truth'],
    ['REVELATION',   'concept', 'God making Himself known'],
    ['RAPTURE',      'concept', 'Catching away of believers at Christ\'s return'],
    ['TRINITY',      'concept', 'One God in three persons: Father, Son, Spirit'],
    ['INCARNATION',  'concept', 'God becoming flesh in Jesus Christ'],
    ['OMNIPOTENT',   'concept', 'All-powerful; attribute of God'],
    ['PROVIDENCE',   'concept', 'God\'s ongoing care and governance of creation'],
    ['RIGHTEOUS',    'concept', 'Morally right and just before God'],
    ['FAITHFUL',     'concept', 'Reliable, constant, and trustworthy'],
    ['SOVEREIGN',    'concept', 'Having supreme authority; describes God'],
    ['SABBATH',      'concept', 'Weekly day of rest ordained by God'],
    ['PRAYER',       'concept', 'Communication with God'],
    ['SIN',          'concept', 'Falling short of God\'s perfect standard'],
    ['LAW',          'concept', 'God\'s moral and ceremonial commands'],
    ['GRACE',        'concept', 'God\'s unmerited favor toward sinners'],
    ['ETERNAL',      'concept', 'Without beginning or end'],
    ['WRATH',        'concept', 'God\'s righteous anger against sin'],
    ['JUDGE',        'concept', 'One who evaluates and renders a verdict'],
    ['THRONE',       'concept', 'Seat of God\'s authority in heaven'],
    ['GLORY',        'concept', 'The weighty brilliance of God\'s presence'],
    ['CROWN',        'concept', 'Symbol of authority and victory'],
    ['SEAL',         'concept', 'Mark of God\'s ownership and protection'],
    ['COVENANT',     'concept', 'Binding agreement between God and people'],
    ['SANCTUM',      'concept', 'Most holy and sacred place'],
    ['GEHENNA',      'concept', 'Valley of Hinnom; used for hell by Jesus'],
    ['SHEOL',        'concept', 'Hebrew underworld or realm of the dead'],
    ['HADES',        'concept', 'Greek word for the realm of the dead'],
    ['RAPTURE',      'concept', 'Being caught up to meet the Lord in the air'],
    // === OBJECTS & SACRED ITEMS ===
    ['ARK',          'object', 'Chest containing the stone tablets of the Law'],
    ['CROSS',        'object', 'Instrument of Jesus\' crucifixion and our salvation'],
    ['TOMB',         'object', 'Rock-cut burial cave of Jesus, found empty'],
    ['SWORD',        'object', 'Weapon; the Word of God is a two-edged sword'],
    ['SHIELD',       'object', 'God is our shield and protector (Psalm 18:2)'],
    ['STAFF',        'object', 'Shepherd\'s tool; Moses\' rod parted the sea'],
    ['SCROLL',       'object', 'Ancient rolled-up manuscript of Scripture'],
    ['TRUMPET',      'object', 'Blown at Jericho; heralds the Lord\'s return'],
    ['LAMPSTAND',    'object', 'Seven-branched menorah in the Tabernacle'],
    ['ALTAR',        'object', 'Elevated place for making offerings to God'],
    ['SCEPTER',      'object', 'Rod of royal authority (Psalm 45:6)'],
    ['ROBE',         'object', 'Worn by priests; the prodigal son received the best robe'],
    ['SANDAL',       'object', 'John the Baptist unworthy to untie Jesus\' sandal'],
    ['BREAD',        'object', 'Jesus is the Bread of Life (John 6:35)'],
    ['WINE',         'object', 'First miracle at Cana; symbol of Christ\'s blood'],
    ['OIL',          'object', 'Used for anointing kings and priests'],
    ['INCENSE',      'object', 'Represents the prayers of the saints'],
    ['GOLD',         'object', 'Precious metal; golden calf made in the wilderness'],
    ['SILVER',       'object', 'Thirty pieces – price of Judas\' betrayal'],
    ['BRONZE',       'object', 'Bronze serpent on a pole healed snake bites'],
    ['LINEN',        'object', 'Used for burial shrouds and priestly garments'],
    ['VEIL',         'object', 'Torn from top to bottom at Jesus\' death'],
    ['MANNA',        'object', 'Bread from heaven fed Israel in the desert'],
    ['MYRRH',        'object', 'One of the three gifts from the Magi'],
    ['EPHOD',        'object', 'Priestly garment worn by the high priest'],
    ['URIM',         'object', 'Sacred lots used by the high priest to discern God\'s will'],
    ['THUMMIM',      'object', 'Paired with Urim for seeking divine guidance'],
    ['PSALTER',      'object', 'The Book of Psalms as a collection'],
    ['TEMPLE',       'object', 'House of God in Jerusalem'],
    ['ROD',          'object', 'Aaron\'s rod that budded as a sign from God'],
    // === ANIMALS & NATURE ===
    ['LAMB',         'animal', 'Symbol of Christ\'s sacrifice; Lamb of God'],
    ['DOVE',         'animal', 'Symbol of the Holy Spirit; brought olive branch to Noah'],
    ['SERPENT',      'animal', 'Deceived Eve in the Garden; bronze serpent of Moses'],
    ['LION',         'animal', 'Symbol of Judah; Jesus is the Lion of Judah'],
    ['EAGLE',        'animal', 'Soar on wings like eagles (Isaiah 40:31)'],
    ['FISH',         'animal', 'Jesus multiplied fish to feed 5000'],
    ['BULL',         'animal', 'Used in animal sacrifices'],
    ['RAM',          'animal', 'Abraham found a ram to sacrifice instead of Isaac'],
    ['GOAT',         'animal', 'Scapegoat sent into the wilderness on Yom Kippur'],
    ['CAMEL',        'animal', 'Easier for a camel to go through eye of needle'],
    ['DONKEY',       'animal', 'Jesus rode a donkey into Jerusalem on Palm Sunday'],
    ['HORSE',        'animal', 'Four horsemen of the Apocalypse (Revelation 6)'],
    ['SPARROW',      'animal', 'Not one falls without the Father knowing'],
    ['RAVEN',        'animal', 'Brought food to Elijah at the brook Cherith'],
    ['LOCUST',       'animal', 'Eighth plague on Egypt; ate John the Baptist\'s food'],
    ['LEVIATHAN',    'animal', 'Great sea monster of chaos (Job 41)'],
    ['BEHEMOTH',     'animal', 'Mighty land creature in God\'s speech to Job'],
    ['HONEY',        'object', 'Land flowing with milk and honey'],
    ['CEDAR',        'object', 'Lumber from Lebanon used to build Solomon\'s Temple'],
    ['OLIVE',        'object', 'Olive branch symbol of peace; Gethsemane means olive press'],
    ['VINE',         'object', 'Jesus is the true vine (John 15)'],
    ['WHEAT',        'object', 'Parable of the wheat and tares'],
    ['BARLEY',       'object', 'Grain used for the feeding of 5000'],
    ['FIG',          'object', 'Jesus cursed an unfruitful fig tree'],
    ['CHERUB',       'object', 'Winged angelic being guarding the ark and Eden'],
    ['CHERUBIM',     'object', 'Plural of cherub; guarded the Garden of Eden'],
    ['SERAPH',       'object', 'Fiery angelic being in Isaiah\'s vision'],
    ['SERAPHIM',     'object', 'Plural of seraph; sang Holy, Holy, Holy before God'],
    ['ANGEL',        'object', 'Heavenly messenger of God'],
    ['NEPHILIM',     'object', 'Giants on earth before the flood (Genesis 6)'],
];

/* ------------------------------------------------------------------ */
/*  Lookup table built once from SCRAB_WORDS                           */
/* ------------------------------------------------------------------ */
function scrabBuildLookup(): array {
    static $lookup = null;
    if ($lookup === null) {
        $lookup = [];
        foreach (SCRAB_WORDS as $entry) {
            $lookup[strtoupper($entry[0])] = ['cat' => $entry[1], 'note' => $entry[2]];
        }
    }
    return $lookup;
}

function scrabWordIsValid(string $word): bool {
    return isset(scrabBuildLookup()[strtoupper($word)]);
}

function scrabWordCategory(string $word): ?string {
    return scrabBuildLookup()[strtoupper($word)]['cat'] ?? null;
}

function scrabWordNote(string $word): ?string {
    return scrabBuildLookup()[strtoupper($word)]['note'] ?? null;
}

function scrabLetterValue(string $letter): int {
    return SCRAB_LETTER_VALUES[strtoupper($letter)] ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Build a fresh shuffled tile bag (returns array of letter strings)  */
/* ------------------------------------------------------------------ */
function scrabBuildInitialBag(): array {
    $bag = [];
    foreach (SCRAB_BAG_DIST as $letter => $count) {
        for ($i = 0; $i < $count; $i++) $bag[] = $letter;
    }
    shuffle($bag);
    return $bag;
}

/* ------------------------------------------------------------------ */
/*  Draw N tiles from bag                                              */
/*  Returns [$drawn, $remainingBag]                                    */
/* ------------------------------------------------------------------ */
function scrabDrawTiles(array $bag, int $n): array {
    $n = min($n, count($bag));
    $drawn = array_splice($bag, 0, $n);
    return [$drawn, $bag];
}

/* ------------------------------------------------------------------ */
/*  Compute score for a word (list of cells with is_new + sq flags)   */
/*  Each cell: ['letter'=>'A', 'pts'=>1, 'is_new'=>bool, 'sq'=>'dl']  */
/* ------------------------------------------------------------------ */
function scrabComputeWordScore(array $wordCells): int {
    $letterSum = 0;
    $wordMult  = 1;
    foreach ($wordCells as $cell) {
        $pts = SCRAB_LETTER_VALUES[$cell['letter']] ?? 0;
        if ($cell['is_new']) {
            $sq = $cell['sq'] ?? '';
            if ($sq === 'tl') $pts *= 3;
            elseif ($sq === 'dl') $pts *= 2;
            elseif ($sq === 'tw') $wordMult *= 3;
            elseif ($sq === 'dw' || $sq === 'star') $wordMult *= 2;
        }
        $letterSum += $pts;
    }
    return $letterSum * $wordMult;
}

/* ------------------------------------------------------------------ */
/*  Validate tile placement and extract all words formed               */
/*  $board: 121-element array (null = empty, string = letter)          */
/*  $newCells: [['row'=>r,'col'=>c,'letter'=>'A',...], ...]            */
/*  $isFirstWord: true if the board is currently empty                 */
/*  Returns: ['valid'=>bool, 'words'=>[[cellArr...]], 'error'=>str]    */
/* ------------------------------------------------------------------ */
function scrabValidatePlacement(array $board, array $newCells, bool $isFirstWord): array {
    if (empty($newCells))
        return ['valid' => false, 'error' => 'No tiles placed'];

    // Bounds + occupied checks
    foreach ($newCells as $c) {
        $r = (int)$c['row']; $col = (int)$c['col'];
        if ($r < 0 || $r > 10 || $col < 0 || $col > 10)
            return ['valid' => false, 'error' => 'Tile out of bounds'];
        if ($board[$r * 11 + $col] !== null)
            return ['valid' => false, 'error' => 'Cell already occupied'];
    }

    // Direction check
    $rows = array_unique(array_column($newCells, 'row'));
    $cols = array_unique(array_column($newCells, 'col'));
    if (count($newCells) > 1 && count($rows) > 1 && count($cols) > 1)
        return ['valid' => false, 'error' => 'Tiles must be in the same row or column'];

    $isHoriz = count($newCells) === 1 ? true : (count($rows) === 1);

    // Merge into temp board
    $temp = $board;
    $newMap = [];
    foreach ($newCells as $c) {
        $idx = (int)$c['row'] * 11 + (int)$c['col'];
        $temp[$idx] = strtoupper((string)$c['letter']);
        $newMap[$idx] = true;
    }

    // Extract a word starting from ($r,$col) going horiz or vert
    $extractWord = function(int $r, int $col, bool $horiz) use ($temp, $newMap, $board): array {
        if ($horiz) {
            while ($col > 0 && $temp[$r * 11 + $col - 1] !== null) $col--;
            $cells = [];
            while ($col <= 10 && $temp[$r * 11 + $col] !== null) {
                $idx = $r * 11 + $col;
                $cells[] = [
                    'row' => $r, 'col' => $col,
                    'letter' => $temp[$idx],
                    'pts' => SCRAB_LETTER_VALUES[$temp[$idx]] ?? 0,
                    'is_new' => isset($newMap[$idx]),
                    'sq' => SCRAB_PREMIUM_GRID[$idx] ?? '',
                ];
                $col++;
            }
        } else {
            while ($r > 0 && $temp[($r - 1) * 11 + $col] !== null) $r--;
            $cells = [];
            while ($r <= 10 && $temp[$r * 11 + $col] !== null) {
                $idx = $r * 11 + $col;
                $cells[] = [
                    'row' => $r, 'col' => $col,
                    'letter' => $temp[$idx],
                    'pts' => SCRAB_LETTER_VALUES[$temp[$idx]] ?? 0,
                    'is_new' => isset($newMap[$idx]),
                    'sq' => SCRAB_PREMIUM_GRID[$idx] ?? '',
                ];
                $r++;
            }
        }
        return $cells;
    };

    $wordsFormed = [];

    // Primary word
    $startRow = (int)$newCells[0]['row'];
    $startCol = (int)$newCells[0]['col'];
    $primaryCells = $extractWord($startRow, $startCol, $isHoriz);
    if (count($primaryCells) >= 2) $wordsFormed[] = $primaryCells;

    // Cross-words (perpendicular to primary direction, one per new tile)
    foreach ($newCells as $c) {
        $cross = $extractWord((int)$c['row'], (int)$c['col'], !$isHoriz);
        if (count($cross) >= 2) $wordsFormed[] = $cross;
    }

    // Require at least one valid word
    if (empty($wordsFormed))
        return ['valid' => false, 'error' => 'Tiles must form a word of at least 2 letters'];

    // First word must pass through center (5, 5) = index 60
    if ($isFirstWord) {
        $hasCenter = false;
        foreach ($wordsFormed as $wc) {
            foreach ($wc as $cell) {
                if ($cell['row'] === 5 && $cell['col'] === 5) { $hasCenter = true; break 2; }
            }
        }
        if (!$hasCenter)
            return ['valid' => false, 'error' => 'First word must cover the ⭐ center square'];
    }

    // Subsequent words must share at least one cell with existing board tiles
    if (!$isFirstWord) {
        $connected = false;
        foreach ($wordsFormed as $wc) {
            foreach ($wc as $cell) {
                if (!$cell['is_new']) { $connected = true; break 2; }
            }
        }
        if (!$connected)
            return ['valid' => false, 'error' => 'Word must connect to tiles already on the board'];
    }

    // All new tiles must be part of some word
    $coveredIdx = [];
    foreach ($wordsFormed as $wc) {
        foreach ($wc as $cell) $coveredIdx[$cell['row'] * 11 + $cell['col']] = true;
    }
    foreach ($newCells as $c) {
        if (!isset($coveredIdx[(int)$c['row'] * 11 + (int)$c['col']]))
            return ['valid' => false, 'error' => 'Gap in placed tiles — all tiles must be part of a word'];
    }

    // Check every word against dictionary
    foreach ($wordsFormed as $wc) {
        $word = implode('', array_column($wc, 'letter'));
        if (!scrabWordIsValid($word))
            return ['valid' => false, 'error' => "\"$word\" is not a valid Bible word"];
    }

    return ['valid' => true, 'words' => $wordsFormed, 'error' => null];
}

/* ------------------------------------------------------------------ */
/*  Deduct remaining rack tile values from player scores at game end   */
/* ------------------------------------------------------------------ */
function scrabRackSubtraction(PDO $db, string $roomCode): void {
    $stmt = $db->prepare("SELECT device_id, scrab_rack FROM players WHERE room_code = ? AND is_host = 0");
    $stmt->execute([$roomCode]);
    foreach ($stmt->fetchAll() as $row) {
        $rack = json_decode($row['scrab_rack'] ?? '[]', true) ?: [];
        $deduction = 0;
        foreach ($rack as $tile) {
            $deduction += SCRAB_LETTER_VALUES[$tile] ?? 0;
        }
        if ($deduction > 0) {
            $db->prepare("UPDATE players SET score = MAX(0, score - ?) WHERE room_code = ? AND device_id = ?")
               ->execute([$deduction, $roomCode, $row['device_id']]);
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Return the device_id of the current turn's player                  */
/* ------------------------------------------------------------------ */
function scrabCurrentPlayerId(array $room): ?string {
    $order = json_decode($room['scrab_turn_order'] ?? '[]', true) ?: [];
    if (empty($order)) return null;
    $idx = ((int)$room['scrab_round'] - 1) % count($order);
    return $order[$idx];
}

/* ------------------------------------------------------------------ */
/*  Advance to the next scrabble turn (call inside a transaction)      */
/*  Returns true if the game ended (bag empty + current player rack    */
/*  empty), false otherwise.                                            */
/* ------------------------------------------------------------------ */
function scrabAdvanceTurn(PDO $db, string $code, array $room): bool {
    $now = nowMs();
    $bag  = json_decode($room['scrab_bag'] ?? '[]', true) ?: [];
    $nextRound = (int)$room['scrab_round'] + 1;
    $passStreak = 0; // reset pass streak on any non-pass action

    // Check end condition: bag empty AND current player has empty rack
    $currentId = scrabCurrentPlayerId($room);
    if (!empty($currentId) && empty($bag)) {
        $rackStmt = $db->prepare("SELECT scrab_rack FROM players WHERE room_code = ? AND device_id = ?");
        $rackStmt->execute([$code, $currentId]);
        $rackRow = $rackStmt->fetchColumn();
        $rack = json_decode($rackRow ?: '[]', true) ?: [];
        if (empty($rack)) {
            scrabRackSubtraction($db, $code);
            $db->prepare("UPDATE rooms SET status = 'finished', updated_at = ? WHERE code = ?")->execute([$now, $code]);
            return true;
        }
    }

    $db->prepare("UPDATE rooms SET scrab_round = ?, scrab_pass_streak = ?, scrab_turn_start_time = ?, updated_at = ? WHERE code = ?")
       ->execute([$nextRound, $passStreak, $now, $now, $code]);
    return false;
}
