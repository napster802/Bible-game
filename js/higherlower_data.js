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
      reference: "Genesis 41:29; Matthew 14:17" }
  ]
};
