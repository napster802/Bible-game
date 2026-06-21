/* ============================================================
   Bible Challenge Arena - Per-Format "How to Play" Instructions
   Shown in the Host Lobby (live, as the host changes format) and
   the Join Wait screen (read-only, reflecting the host's choice)
   so everyone knows the rules before Start Game is pressed.
   ============================================================ */
const GameInstructions = (function () {
  const MODES = {
    classic: {
      title: '🎯 Classic (4 Choices)',
      text: 'Read the question, then tap the answer you think is correct out of 4 choices. Faster correct answers earn more points.'
    },
    truefalse: {
      title: '⚡ Lightning True/False',
      text: 'A statement is shown. Tap True or False as fast as you can - the clock is tight, so don\'t overthink it!'
    },
    scramble: {
      title: '🔤 Word Scramble',
      text: 'The letters of the answer are shuffled. Type the unscrambled word before time runs out.'
    },
    survival: {
      title: '💀 Sudden Death Survival',
      text: 'Same as Classic, but one wrong answer eliminates you. Last player standing wins!'
    },
    memory: {
      title: '🧠 Memory Match',
      text: 'Flip cards to match each Bible name with its correct verse reference. Find all the pairs as fast as you can.'
    },
    twotruths: {
      title: '🤥 Two Truths and a Lie',
      text: 'Three statements about a Bible person or event are shown - two are true, one is a lie. Tap the lie.'
    },
    higherlower: {
      title: '📊 Higher or Lower',
      text: 'Two Bible facts with numbers are shown side by side. Tap the one you think has the BIGGER number.'
    },
    versefill: {
      title: '📖 Verse Fill-in-the-Blank',
      text: 'A well-known verse is shown with one word missing. Type the missing word - no choices given.'
    },
    emojiclue: {
      title: '🌊 Emoji Story Clue',
      text: 'An emoji sequence hints at a Bible character or event. A hint tells you whether to answer with a Character (one word) or a Bible Event (2-3 words).'
    },
    impostor: {
      title: '🕵️ Word Impostor',
      text: 'Everyone gets the same secret word except one Impostor, who gets a sneaky related word instead. Give a one-word clue, discuss out loud, then vote out who you think is the Impostor. No timer - rounds advance once everyone has acted. Needs 3+ players.'
    },
    draw: {
      title: '🎨 Sketch & Guess',
      text: 'Players take turns drawing, in join order. The drawer picks one of 4 secret words and sketches it while everyone else types guesses. The first 3 correct guessers score points, and the drawer earns a bonus for each. Needs 2+ players.'
    }
  };

  function render(format, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const info = MODES[format] || MODES.classic;
    el.innerHTML = `<p class="instructions-title">${info.title}</p><p class="instructions-text">${info.text}</p>`;
  }

  return { MODES, render };
})();
