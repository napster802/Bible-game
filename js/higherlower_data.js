/* ============================================================
   Bible Challenge Arena - Higher or Lower Data
   Each pair has two numeric Bible facts; players tap the one
   they think has the bigger number. leftValue/rightValue are
   never equal so there's always a single correct side.
   ============================================================ */
const HigherLowerData = {
  PAIRS: [
    { leftLabel: "Methuselah's age when he died", leftValue: 969,
      rightLabel: "Noah's age when the flood began", rightValue: 600,
      reference: "Genesis 5:27; 7:6" },

    { leftLabel: "Length of Noah's ark in cubits", leftValue: 300,
      rightLabel: "Width of Noah's ark in cubits", rightValue: 50,
      reference: "Genesis 6:15" },

    { leftLabel: "Number of plagues sent on Egypt", leftValue: 10,
      rightLabel: "Number of apostles Jesus chose", rightValue: 12,
      reference: "Exodus 7-12; Matthew 10:1-4" },

    { leftLabel: "Abraham's age when Isaac was born", leftValue: 100,
      rightLabel: "Sarah's age when Isaac was born", rightValue: 90,
      reference: "Genesis 21:5; 17:17" },

    { leftLabel: "Years Israelites wandered the desert", leftValue: 40,
      rightLabel: "Years of famine Joseph predicted", rightValue: 7,
      reference: "Numbers 14:33; Genesis 41:30" },

    { leftLabel: "Stones David chose to fight Goliath", leftValue: 5,
      rightLabel: "Times Naaman dipped in the Jordan", rightValue: 7,
      reference: "1 Samuel 17:40; 2 Kings 5:14" },

    { leftLabel: "People fed at the feeding of the 5,000", leftValue: 5000,
      rightLabel: "People fed at the feeding of the 4,000", rightValue: 4000,
      reference: "Matthew 14:21; 15:38" },

    { leftLabel: "Years Israelites were enslaved in Egypt", leftValue: 400,
      rightLabel: "Methuselah's age when he died", rightValue: 969,
      reference: "Genesis 15:13; 5:27" },

    { leftLabel: "Years David reigned in Jerusalem", leftValue: 33,
      rightLabel: "Years David reigned in Hebron", rightValue: 7,
      reference: "2 Samuel 5:5" },

    { leftLabel: "Years Solomon reigned as king", leftValue: 40,
      rightLabel: "Years it took Solomon to build the Temple", rightValue: 7,
      reference: "1 Kings 11:42; 6:38" },

    { leftLabel: "Number of tribes of Israel", leftValue: 12,
      rightLabel: "Number of brothers Joseph had", rightValue: 11,
      reference: "Genesis 49; 35:22-26" },

    { leftLabel: "Noah's age when he died", leftValue: 950,
      rightLabel: "Noah's age when the flood began", rightValue: 600,
      reference: "Genesis 9:29; 7:6" },

    { leftLabel: "Goliath's height in cubits", leftValue: 6,
      rightLabel: "Stones David chose to fight Goliath", rightValue: 5,
      reference: "1 Samuel 17:4,40" },

    { leftLabel: "Times Peter denied knowing Jesus", leftValue: 3,
      rightLabel: "Fish used to feed the 5,000", rightValue: 2,
      reference: "Matthew 26:34,75; 14:17" },

    { leftLabel: "Loaves used to feed the 5,000", leftValue: 5,
      rightLabel: "Fish used to feed the 5,000", rightValue: 2,
      reference: "Matthew 14:17" },

    { leftLabel: "Adam's age when he died", leftValue: 930,
      rightLabel: "Years Israelites were enslaved in Egypt", rightValue: 400,
      reference: "Genesis 5:5; 15:13" },

    { leftLabel: "Isaac's age when he married Rebekah", leftValue: 40,
      rightLabel: "Years of famine Joseph predicted", rightValue: 7,
      reference: "Genesis 25:20; 41:30" },

    { leftLabel: "Years Jacob worked for Laban before marrying", leftValue: 14,
      rightLabel: "Years David reigned in Hebron", rightValue: 7,
      reference: "Genesis 29:27-30; 2 Samuel 5:5" },

    { leftLabel: "Width of Noah's ark in cubits", leftValue: 50,
      rightLabel: "Height of Noah's ark in cubits", rightValue: 30,
      reference: "Genesis 6:15" },

    { leftLabel: "Number of apostles Jesus chose", leftValue: 12,
      rightLabel: "Years of plenty before Egypt's famine", rightValue: 7,
      reference: "Matthew 10:1-4; Genesis 41:29" },

    { leftLabel: "Abraham's age when Isaac was born", leftValue: 100,
      rightLabel: "Years Israelites wandered the desert", rightValue: 40,
      reference: "Genesis 21:5; Numbers 14:33" },

    { leftLabel: "Approx. Israelite men of fighting age in the Exodus", leftValue: 600000,
      rightLabel: "Methuselah's age when he died", rightValue: 969,
      reference: "Exodus 12:37; Genesis 5:27" },

    { leftLabel: "Approx. Israelite men of fighting age in the Exodus", leftValue: 600000,
      rightLabel: "Years Israelites were enslaved in Egypt", rightValue: 400,
      reference: "Exodus 12:37; Genesis 15:13" },

    { leftLabel: "Years of plenty before Egypt's famine", leftValue: 7,
      rightLabel: "Fish used to feed the 5,000", rightValue: 2,
      reference: "Genesis 41:29; Matthew 14:17" },

    { leftLabel: "Jared's age when he died", leftValue: 962,
      rightLabel: "Seth's age when he died", rightValue: 912,
      reference: "Genesis 5:20,8" },

    { leftLabel: "Lamech's age when he died", leftValue: 777,
      rightLabel: "Enosh's age when he died", rightValue: 905,
      reference: "Genesis 5:31,11" },

    { leftLabel: "Jacob's total age when he died", leftValue: 147,
      rightLabel: "Years Jacob lived in Egypt", rightValue: 17,
      reference: "Genesis 47:28" },

    { leftLabel: "Joseph's age when he died", leftValue: 110,
      rightLabel: "Joseph's age when made ruler of Egypt", rightValue: 30,
      reference: "Genesis 50:26; 41:46" },

    { leftLabel: "Moses' age when he died", leftValue: 120,
      rightLabel: "Moses' age when he led the Exodus", rightValue: 80,
      reference: "Deuteronomy 34:7; Exodus 7:7" },

    { leftLabel: "Aaron's age when he died", leftValue: 123,
      rightLabel: "Aaron's age at the Exodus", rightValue: 83,
      reference: "Numbers 33:39; Exodus 7:7" },

    { leftLabel: "Men in Gideon's final army", leftValue: 300,
      rightLabel: "Stones David chose to fight Goliath", rightValue: 5,
      reference: "Judges 7:7; 1 Samuel 17:40" },

    { leftLabel: "Philistines Samson killed with a donkey's jawbone", leftValue: 1000,
      rightLabel: "Years Samson judged Israel", rightValue: 20,
      reference: "Judges 15:15-16,20" },

    { leftLabel: "Goliath's spear head weight in shekels of iron", leftValue: 600,
      rightLabel: "Goliath's coat of mail weight in shekels of brass", rightValue: 5000,
      reference: "1 Samuel 17:5,7" },

    { leftLabel: "David's age when he began to reign", leftValue: 30,
      rightLabel: "Total years David reigned", rightValue: 40,
      reference: "2 Samuel 5:4" },

    { leftLabel: "Solomon's wives", leftValue: 700,
      rightLabel: "Solomon's concubines", rightValue: 300,
      reference: "1 Kings 11:3" },

    { leftLabel: "Solomon's annual gold income in talents", leftValue: 666,
      rightLabel: "Years it took to build Solomon's own palace", rightValue: 13,
      reference: "1 Kings 10:14; 7:1" },

    { leftLabel: "Queen of Sheba's gift of gold in talents", leftValue: 120,
      rightLabel: "Years it took to build the Temple", rightValue: 7,
      reference: "1 Kings 10:10; 6:38" },

    { leftLabel: "Stalls of horses Solomon had", leftValue: 40000,
      rightLabel: "Solomon's wives", rightValue: 700,
      reference: "1 Kings 4:26; 11:3" },

    { leftLabel: "Prophets of Baal Elijah faced", leftValue: 450,
      rightLabel: "Prophets of Asherah with them", rightValue: 400,
      reference: "1 Kings 18:19" },

    { leftLabel: "Jehoiachin's age when he began to reign", leftValue: 18,
      rightLabel: "Josiah's age when he began to reign", rightValue: 8,
      reference: "2 Kings 24:8; 22:1" },

    { leftLabel: "Years Manasseh reigned in Jerusalem", leftValue: 55,
      rightLabel: "Years added to Hezekiah's life", rightValue: 15,
      reference: "2 Kings 21:1; 20:6" },

    { leftLabel: "Days of Daniel's food test", leftValue: 10,
      rightLabel: "Days of Daniel's three weeks of mourning", rightValue: 21,
      reference: "Daniel 1:12; 10:2-3" },

    { leftLabel: "Height of Nebuchadnezzar's golden image in cubits", leftValue: 60,
      rightLabel: "Stones David chose to fight Goliath", rightValue: 5,
      reference: "Daniel 3:1; 1 Samuel 17:40" },

    { leftLabel: "Days Jonah was in the great fish", leftValue: 3,
      rightLabel: "Days of repentance given to Nineveh", rightValue: 40,
      reference: "Jonah 1:17; 3:4" },

    { leftLabel: "Months of Esther's beauty treatments", leftValue: 12,
      rightLabel: "Provinces under King Ahasuerus", rightValue: 127,
      reference: "Esther 2:12; 1:1" },

    { leftLabel: "Job's children before his trial", leftValue: 10,
      rightLabel: "Job's friends who came to comfort him", rightValue: 3,
      reference: "Job 1:2; 2:11" },

    { leftLabel: "Job's years lived after his restoration", leftValue: 140,
      rightLabel: "Job's children before his trial", rightValue: 10,
      reference: "Job 42:16; 1:2" },

    { leftLabel: "Job's sheep after his restoration", leftValue: 14000,
      rightLabel: "Job's years lived after his restoration", rightValue: 140,
      reference: "Job 42:12,16" },

    { leftLabel: "Jesus' age when found in the Temple", leftValue: 12,
      rightLabel: "Days Jesus fasted in the wilderness", rightValue: 40,
      reference: "Luke 2:42; Matthew 4:2" },

    { leftLabel: "Years the woman with the issue of blood suffered", leftValue: 12,
      rightLabel: "Years the lame man at Bethesda's pool was sick", rightValue: 38,
      reference: "Mark 5:25; John 5:5" },

    { leftLabel: "Baskets of leftovers after feeding the 5,000", leftValue: 12,
      rightLabel: "Baskets of leftovers after feeding the 4,000", rightValue: 7,
      reference: "Matthew 14:20; 15:37" },

    { leftLabel: "Lepers healed by Jesus on the road", leftValue: 10,
      rightLabel: "Lepers who returned to thank Him", rightValue: 1,
      reference: "Luke 17:12-17" },

    { leftLabel: "Jairus' daughter's age", leftValue: 12,
      rightLabel: "Days Jesus fasted in the wilderness", rightValue: 40,
      reference: "Mark 5:42; Matthew 4:2" },

    { leftLabel: "Silver pieces Judas was paid", leftValue: 30,
      rightLabel: "Jairus' daughter's age", rightValue: 12,
      reference: "Matthew 26:15; Mark 5:42" },

    { leftLabel: "Days Jesus appeared to His disciples after the resurrection", leftValue: 40,
      rightLabel: "People gathered in the upper room at Pentecost", rightValue: 120,
      reference: "Acts 1:3,15" },

    { leftLabel: "People converted on the Day of Pentecost", leftValue: 3000,
      rightLabel: "People gathered in the upper room at Pentecost", rightValue: 120,
      reference: "Acts 2:41; 1:15" },

    { leftLabel: "Lashes Paul received under Jewish law", leftValue: 39,
      rightLabel: "Times Paul says he was shipwrecked", rightValue: 3,
      reference: "2 Corinthians 11:24-25" },

    { leftLabel: "Years since Paul was caught up to the third heaven", leftValue: 14,
      rightLabel: "Lashes Paul received under Jewish law", rightValue: 39,
      reference: "2 Corinthians 12:2; 11:24" },

    { leftLabel: "Churches addressed in the book of Revelation", leftValue: 7,
      rightLabel: "Years of the Millennium in Revelation", rightValue: 1000,
      reference: "Revelation 1:4,11; 20:2-4" },

    { leftLabel: "Plagues/bowls poured out in Revelation", leftValue: 7,
      rightLabel: "Stalls of horses Solomon had", rightValue: 40000,
      reference: "Revelation 16:1; 1 Kings 4:26" },

    { leftLabel: "Years of the Millennium in Revelation", leftValue: 1000,
      rightLabel: "Solomon's annual gold income in talents", rightValue: 666,
      reference: "Revelation 20:2-4; 1 Kings 10:14" },

    { leftLabel: "Goliath's height in cubits", leftValue: 6,
      rightLabel: "Goliath's spear head weight in shekels of iron", rightValue: 600,
      reference: "1 Samuel 17:4,7" },

    { leftLabel: "Number of plagues sent on Egypt", leftValue: 10,
      rightLabel: "Days of repentance given to Nineveh", rightValue: 40,
      reference: "Exodus 7-12; Jonah 3:4" },

    { leftLabel: "Total years David reigned", leftValue: 40,
      rightLabel: "David's age when he began to reign", rightValue: 30,
      reference: "2 Samuel 5:4" },

    { leftLabel: "Jacob's total age when he died", leftValue: 147,
      rightLabel: "Joseph's age when he died", rightValue: 110,
      reference: "Genesis 47:28; 50:26" },

    { leftLabel: "Moses' age when he died", leftValue: 120,
      rightLabel: "Aaron's age when he died", rightValue: 123,
      reference: "Deuteronomy 34:7; Numbers 33:39" },

    { leftLabel: "Aaron's age at the Exodus", leftValue: 83,
      rightLabel: "Moses' age when he led the Exodus", rightValue: 80,
      reference: "Exodus 7:7" },

    { leftLabel: "Years Jacob lived in Egypt", leftValue: 17,
      rightLabel: "Years of famine Joseph predicted", rightValue: 7,
      reference: "Genesis 47:28; 41:30" },

    { leftLabel: "Men in Gideon's final army", leftValue: 300,
      rightLabel: "Goliath's height in cubits", rightValue: 6,
      reference: "Judges 7:7; 1 Samuel 17:4" },

    { leftLabel: "Solomon's concubines", leftValue: 300,
      rightLabel: "Prophets of Asherah Elijah faced", rightValue: 400,
      reference: "1 Kings 11:3; 18:19" },

    { leftLabel: "Provinces under King Ahasuerus", leftValue: 127,
      rightLabel: "Months of Esther's beauty treatments", rightValue: 12,
      reference: "Esther 1:1; 2:12" },

    { leftLabel: "Job's sheep after his restoration", leftValue: 14000,
      rightLabel: "Stalls of horses Solomon had", rightValue: 40000,
      reference: "Job 42:12; 1 Kings 4:26" },

    { leftLabel: "People converted on the Day of Pentecost", leftValue: 3000,
      rightLabel: "Years of the Millennium in Revelation", rightValue: 1000,
      reference: "Acts 2:41; Revelation 20:2-4" },

    { leftLabel: "Silver pieces Judas was paid", leftValue: 30,
      rightLabel: "Lashes Paul received under Jewish law", rightValue: 39,
      reference: "Matthew 26:15; 2 Corinthians 11:24" }
  ]
};
