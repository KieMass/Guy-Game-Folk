/*
  minigames.js
  Puzzle-gate mini-games (v2): a locked 'gate' Platform (see entities.js /
  levels.js) blocks the level until its puzzle is solved. Reuses the existing
  Game.state machine (js/game.js) -- setState('puzzle') freezes the world the
  same way 'paused'/'levelintro' already do, and setState(Game.prevState)
  resumes gameplay exactly where it left off once solved.

  Four puzzle types, picked per-gate in levels.js via `puzzleType`:
    'trivia'   - multiple choice, pulled from the large TRIVIA_POOL below.
    'sequence' - a Simon-says color pattern to watch then repeat.
    'sliding'  - a classic 3x3 sliding tile puzzle.
    'word'     - unscramble a hinted word by clicking letter tiles in order.

  A wrong answer never costs a life -- only a small score/time penalty via
  resolvePuzzleFail(), then the same puzzle type re-renders so the player can
  retry immediately.
*/

// ---------------- question / word pools ----------------
const TRIVIA_POOL = [
  // animals
  { q: 'Which animal is known as the "King of the Jungle"?', choices: ['Lion', 'Tiger', 'Elephant', 'Bear'], answer: 0 },
  { q: 'How many legs does a spider have?', choices: ['6', '8', '10', '4'], answer: 1 },
  { q: 'What is a baby kangaroo called?', choices: ['Cub', 'Joey', 'Calf', 'Kit'], answer: 1 },
  { q: 'Which of these birds cannot fly?', choices: ['Eagle', 'Penguin', 'Sparrow', 'Hawk'], answer: 1 },
  { q: 'What do you call a group of wolves?', choices: ['Herd', 'Pack', 'Flock', 'School'], answer: 1 },
  { q: 'Which is the largest mammal on Earth?', choices: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], answer: 1 },
  { q: 'How many hearts does an octopus have?', choices: ['1', '2', '3', '4'], answer: 2 },
  { q: 'Which animal is famous for changing color to blend in?', choices: ['Chameleon', 'Frog', 'Lizard', 'Snake'], answer: 0 },
  { q: 'What is the fastest land animal?', choices: ['Lion', 'Cheetah', 'Horse', 'Ostrich'], answer: 1 },
  { q: 'Which sea creature has eight arms?', choices: ['Squid', 'Octopus', 'Jellyfish', 'Starfish'], answer: 1 },
  // geography
  { q: 'What is the largest continent by area?', choices: ['Africa', 'Asia', 'Europe', 'North America'], answer: 1 },
  { q: 'Which is the longest river in the world?', choices: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'], answer: 1 },
  { q: 'What is the largest ocean on Earth?', choices: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2 },
  { q: 'Which country is known as the "Land of the Rising Sun"?', choices: ['China', 'Japan', 'Thailand', 'Korea'], answer: 1 },
  { q: 'What is the smallest continent?', choices: ['Australia', 'Europe', 'Antarctica', 'South America'], answer: 0 },
  { q: 'Which desert is the largest hot desert in the world?', choices: ['Gobi', 'Sahara', 'Kalahari', 'Mojave'], answer: 1 },
  { q: 'What is the capital of France?', choices: ['Berlin', 'Madrid', 'Paris', 'Rome'], answer: 2 },
  { q: 'Which mountain is the tallest in the world?', choices: ['K2', 'Everest', 'Kilimanjaro', 'Denali'], answer: 1 },
  { q: 'How many continents are there?', choices: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which is the largest country by land area?', choices: ['Canada', 'USA', 'China', 'Russia'], answer: 3 },
  // science
  { q: 'What gas do plants absorb from the air to grow?', choices: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium'], answer: 1 },
  { q: 'What is the boiling point of water in Celsius?', choices: ['50', '100', '150', '200'], answer: 1 },
  { q: 'What planet do we live on?', choices: ['Mars', 'Venus', 'Earth', 'Jupiter'], answer: 2 },
  { q: 'What force pulls objects down toward the Earth?', choices: ['Magnetism', 'Gravity', 'Friction', 'Electricity'], answer: 1 },
  { q: 'What is the chemical symbol for water?', choices: ['O2', 'CO2', 'H2O', 'NaCl'], answer: 2 },
  { q: 'What part of a plant absorbs water from the soil?', choices: ['Leaves', 'Roots', 'Stem', 'Flower'], answer: 1 },
  { q: 'About how many bones are in the adult human body?', choices: ['106', '206', '306', '406'], answer: 1 },
  { q: 'What do bees make?', choices: ['Milk', 'Honey', 'Silk', 'Butter'], answer: 1 },
  { q: 'Which sense organ do you use to see?', choices: ['Ears', 'Nose', 'Eyes', 'Skin'], answer: 2 },
  { q: 'What is the process by which plants make their own food called?', choices: ['Respiration', 'Photosynthesis', 'Digestion', 'Evaporation'], answer: 1 },
  // space
  { q: 'Which planet is known as the Red Planet?', choices: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
  { q: 'What is the closest star to Earth?', choices: ['North Star', 'The Sun', 'Sirius', 'Polaris'], answer: 1 },
  { q: 'What do we call a rocky object smaller than a planet that orbits the sun?', choices: ['Asteroid', 'Comet', 'Moon', 'Star'], answer: 0 },
  { q: 'How many planets are in our solar system?', choices: ['7', '8', '9', '10'], answer: 1 },
  { q: 'What is Earth\'s only natural satellite called?', choices: ['Mars', 'The Moon', 'Titan', 'Europa'], answer: 1 },
  { q: 'Which planet is famous for its rings?', choices: ['Mars', 'Saturn', 'Mercury', 'Earth'], answer: 1 },
  { q: 'What do we call a group of stars that forms a pattern?', choices: ['Galaxy', 'Constellation', 'Nebula', 'Orbit'], answer: 1 },
  { q: 'What is the name of the galaxy that contains our solar system?', choices: ['Andromeda', 'Milky Way', 'Whirlpool', 'Sombrero'], answer: 1 },
  { q: 'Who was the first person to walk on the Moon?', choices: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'], answer: 1 },
  { q: 'What do astronauts wear to breathe in space?', choices: ['A helmet', 'A space suit', 'A mask', 'A backpack'], answer: 1 },
  // math
  { q: 'What is 7 x 8?', choices: ['54', '56', '58', '64'], answer: 1 },
  { q: 'What is half of 100?', choices: ['25', '40', '50', '60'], answer: 2 },
  { q: 'How many sides does a hexagon have?', choices: ['5', '6', '7', '8'], answer: 1 },
  { q: 'What is 15 + 27?', choices: ['32', '42', '52', '40'], answer: 1 },
  { q: 'What shape has exactly three sides?', choices: ['Square', 'Triangle', 'Circle', 'Pentagon'], answer: 1 },
  { q: 'What is 9 x 9?', choices: ['72', '81', '89', '99'], answer: 1 },
  { q: 'How many minutes are in an hour?', choices: ['30', '45', '60', '90'], answer: 2 },
  { q: 'What is 100 divided by 4?', choices: ['20', '25', '30', '40'], answer: 1 },
  { q: 'How many days are in a leap year?', choices: ['364', '365', '366', '367'], answer: 2 },
  { q: 'What do you call a number only divisible by 1 and itself?', choices: ['Even number', 'Prime number', 'Odd number', 'Square number'], answer: 1 },
  // everyday / general
  { q: 'What do bees collect from flowers to make honey?', choices: ['Pollen', 'Nectar', 'Water', 'Sap'], answer: 1 },
  { q: 'Which meal do people usually eat in the morning?', choices: ['Lunch', 'Dinner', 'Breakfast', 'Snack'], answer: 2 },
  { q: 'What is the freezing point of water in Celsius?', choices: ['-10', '0', '10', '32'], answer: 1 },
  { q: 'How many colors are in a rainbow?', choices: ['5', '6', '7', '8'], answer: 2 },
  { q: 'What tool do you use to tell the time?', choices: ['Ruler', 'Clock', 'Scale', 'Compass'], answer: 1 },
  { q: 'Which season comes right after winter?', choices: ['Summer', 'Fall', 'Spring', 'Autumn'], answer: 2 },
  { q: 'What do you call a story with magic or myths that isn\'t true?', choices: ['Biography', 'Fable', 'Newspaper', 'Textbook'], answer: 1 },
  { q: 'How many days are in a week?', choices: ['5', '6', '7', '8'], answer: 2 },
  { q: 'What color do you get by mixing blue and yellow?', choices: ['Purple', 'Orange', 'Green', 'Brown'], answer: 2 },
  { q: 'What instrument do you use to check your temperature?', choices: ['Thermometer', 'Barometer', 'Compass', 'Telescope'], answer: 0 },
];

const WORD_POOL = [
  { word: 'JUNGLE', hint: 'A thick, wild forest full of plants and animals' },
  { word: 'RIVER', hint: 'Flowing water that runs to the sea' },
  { word: 'JAGUAR', hint: 'A powerful big cat with spotted fur' },
  { word: 'EAGLE', hint: 'A large bird of prey with sharp eyesight' },
  { word: 'TURTLE', hint: 'A reptile that carries its home on its back' },
  { word: 'COMPASS', hint: 'A tool that always points north' },
  { word: 'WATERFALL', hint: 'Where a river drops suddenly over a cliff' },
  { word: 'TREASURE', hint: 'Gold, gems, or other valuable things hidden away' },
  { word: 'MOUNTAIN', hint: 'A very tall, rocky landform' },
  { word: 'RAINBOW', hint: 'A colorful arc that appears in the sky after rain' },
];

const SEQ_COLORS = ['#FCD116', '#CE1126', '#009E49', '#2e86c1'];

// ---------------- entry point (called from game.js updatePlaying) ----------------
function startGatePuzzle(gate) {
  Game.prevState = Game.state;
  Game.puzzle = { gate, type: gate.puzzleType || 'trivia' };
  setState('puzzle');
  renderPuzzleUI();
}

function renderPuzzleUI() {
  const body = document.getElementById('puzzle-body');
  body.innerHTML = '';
  document.getElementById('puzzle-status').textContent = '';
  switch (Game.puzzle.type) {
    case 'sequence': renderSequence(body); break;
    case 'sliding': renderSliding(body); break;
    case 'word': renderWord(body); break;
    default: renderTrivia(body); break;
  }
}

function resolvePuzzleSuccess() {
  Game.puzzle.gate.open = true;
  const returnTo = Game.prevState || 'playing';
  Game.puzzle = null;
  setState(returnTo);
}

// Shared "wrong answer" penalty: a small score/time cost, never a life --
// addScore() already clamps at 0 (js/game.js), and Game.levelElapsed is the
// same clock completeLevel() reads for the time bonus, so this is a real but
// small cost. Caller is responsible for re-rendering the puzzle afterward.
function resolvePuzzleFail(message) {
  addScore(-15);
  Game.levelElapsed += 5;
  const status = document.getElementById('puzzle-status');
  status.textContent = message || 'Not quite -- try again! (-15 pts)';
  status.classList.remove('puzzle-flash-wrong');
  void status.offsetWidth; // restart the CSS animation
  status.classList.add('puzzle-flash-wrong');
}

// digit keys 1-4 while a trivia puzzle is up (js/game.js handleKeyAction)
function handlePuzzleDigitKey(i) {
  if (Game.state !== 'puzzle' || !Game.puzzle || Game.puzzle.type !== 'trivia') return;
  if (Game.puzzle.current && i >= 0 && i < Game.puzzle.current.choices.length) submitTriviaAnswer(i);
}

// ---------------- trivia ----------------
function pickTriviaQuestion() {
  Game.usedTriviaIds = Game.usedTriviaIds || new Set();
  const available = [];
  for (let i = 0; i < TRIVIA_POOL.length; i++) if (!Game.usedTriviaIds.has(i)) available.push(i);
  if (available.length === 0) { Game.usedTriviaIds.clear(); for (let i = 0; i < TRIVIA_POOL.length; i++) available.push(i); }
  const idx = pickRandom(available);
  Game.usedTriviaIds.add(idx);
  return TRIVIA_POOL[idx];
}

function renderTrivia(body) {
  document.getElementById('puzzle-title').textContent = 'Answer to Open the Gate';
  const q = pickTriviaQuestion();
  Game.puzzle.current = q;

  const prompt = document.createElement('p');
  prompt.className = 'fact-text';
  prompt.textContent = q.q;
  body.appendChild(prompt);

  const grid = document.createElement('div');
  grid.className = 'answer-grid';
  q.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = `${i + 1}. ${choice}`;
    btn.addEventListener('click', () => submitTriviaAnswer(i));
    grid.appendChild(btn);
  });
  body.appendChild(grid);
}

function submitTriviaAnswer(i) {
  if (!Game.puzzle || Game.puzzle.type !== 'trivia') return;
  if (i === Game.puzzle.current.answer) {
    resolvePuzzleSuccess();
  } else {
    resolvePuzzleFail();
    renderPuzzleUI();
  }
}

// ---------------- sequence (Simon-says) ----------------
function renderSequence(body) {
  document.getElementById('puzzle-title').textContent = 'Watch, Then Repeat the Pattern';
  const length = Game.puzzle.seqLength || 3;
  Game.puzzle.seqLength = length;
  const pattern = [];
  for (let i = 0; i < length; i++) pattern.push(Math.floor(Math.random() * 4));
  Game.puzzle.pattern = pattern;
  Game.puzzle.progress = 0;
  Game.puzzle.locked = true;

  const grid = document.createElement('div');
  grid.className = 'seq-grid';
  const pads = [];
  for (let i = 0; i < 4; i++) {
    const pad = document.createElement('button');
    pad.className = 'seq-pad';
    pad.style.background = SEQ_COLORS[i];
    pad.addEventListener('click', () => handleSequenceClick(i));
    grid.appendChild(pad);
    pads.push(pad);
  }
  body.appendChild(grid);
  Game.puzzle.pads = pads;

  const status = document.getElementById('puzzle-status');
  status.textContent = 'Watch closely...';
  playSequence(pattern, pads, () => {
    if (Game.puzzle && Game.puzzle.pads === pads) {
      Game.puzzle.locked = false;
      status.textContent = 'Now repeat it!';
    }
  });
}

function playSequence(pattern, pads, onDone) {
  let i = 0;
  function step() {
    if (i >= pattern.length) { onDone(); return; }
    const pad = pads[pattern[i]];
    pad.classList.add('seq-pad-lit');
    setTimeout(() => {
      pad.classList.remove('seq-pad-lit');
      i++;
      setTimeout(step, 250);
    }, 500);
  }
  step();
}

function handleSequenceClick(i) {
  if (!Game.puzzle || Game.puzzle.type !== 'sequence' || Game.puzzle.locked) return;
  const pad = Game.puzzle.pads[i];
  pad.classList.add('seq-pad-lit');
  setTimeout(() => pad.classList.remove('seq-pad-lit'), 200);
  if (Game.puzzle.pattern[Game.puzzle.progress] === i) {
    Game.puzzle.progress++;
    if (Game.puzzle.progress >= Game.puzzle.pattern.length) resolvePuzzleSuccess();
  } else {
    Game.puzzle.locked = true;
    resolvePuzzleFail();
    renderPuzzleUI();
  }
}

// ---------------- sliding tile puzzle ----------------
function slideNeighbors(i) {
  const row = Math.floor(i / 3), col = i % 3;
  const n = [];
  if (row > 0) n.push(i - 3);
  if (row < 2) n.push(i + 3);
  if (col > 0) n.push(i - 1);
  if (col < 2) n.push(i + 1);
  return n;
}

function renderSliding(body) {
  document.getElementById('puzzle-title').textContent = 'Slide the Tiles Into Order';
  const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let blank = 8;
  // random walk of legal moves from the solved state -- always solvable,
  // unlike a fully random shuffle which can land on an unsolvable half.
  for (let m = 0; m < 80; m++) {
    const neighbors = slideNeighbors(blank);
    const swapWith = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blank], tiles[swapWith]] = [tiles[swapWith], tiles[blank]];
    blank = swapWith;
  }
  Game.puzzle.tiles = tiles;

  const hint = document.createElement('p');
  hint.className = 'fact-text';
  hint.textContent = 'Click a tile next to the empty space to slide it. Get 1-8 in order!';
  body.appendChild(hint);

  const grid = document.createElement('div');
  grid.className = 'slide-grid';
  body.appendChild(grid);
  renderSlideTiles(grid);
  Game.puzzle.gridEl = grid;

  const reshuffle = document.createElement('button');
  reshuffle.className = 'big-button';
  reshuffle.textContent = 'Shuffle Again';
  reshuffle.addEventListener('click', () => {
    resolvePuzzleFail('Reshuffled (-15 pts)');
    renderPuzzleUI();
  });
  body.appendChild(reshuffle);
}

function renderSlideTiles(grid) {
  grid.innerHTML = '';
  Game.puzzle.tiles.forEach((val, i) => {
    const tile = document.createElement('button');
    tile.className = 'slide-tile' + (val === 0 ? ' slide-tile-blank' : '');
    tile.textContent = val === 0 ? '' : String(val);
    tile.addEventListener('click', () => handleSlideTileClick(i));
    grid.appendChild(tile);
  });
}

function handleSlideTileClick(i) {
  if (!Game.puzzle || Game.puzzle.type !== 'sliding') return;
  const tiles = Game.puzzle.tiles;
  const blank = tiles.indexOf(0);
  if (!slideNeighbors(blank).includes(i)) return;
  [tiles[blank], tiles[i]] = [tiles[i], tiles[blank]];
  renderSlideTiles(Game.puzzle.gridEl);
  const solved = tiles.every((v, idx) => v === (idx === 8 ? 0 : idx + 1));
  if (solved) resolvePuzzleSuccess();
}

// ---------------- word scramble ----------------
function scrambleLetters(word) {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join('') === word) return scrambleLetters(word); // avoid a no-op scramble
  return letters;
}

function renderWord(body) {
  document.getElementById('puzzle-title').textContent = 'Unscramble the Word';
  const entry = pickRandom(WORD_POOL);
  Game.puzzle.word = entry.word;
  Game.puzzle.letters = scrambleLetters(entry.word);
  Game.puzzle.slots = [];

  const hint = document.createElement('p');
  hint.className = 'fact-text';
  hint.textContent = `Hint: ${entry.hint}`;
  body.appendChild(hint);

  const slotsRow = document.createElement('div');
  slotsRow.className = 'word-slots';
  body.appendChild(slotsRow);
  Game.puzzle.slotsEl = slotsRow;

  const lettersRow = document.createElement('div');
  lettersRow.className = 'word-slots';
  body.appendChild(lettersRow);
  Game.puzzle.lettersEl = lettersRow;

  renderWordTiles();

  const submit = document.createElement('button');
  submit.className = 'big-button';
  submit.textContent = 'Submit';
  submit.addEventListener('click', submitWordAnswer);
  body.appendChild(submit);
}

function renderWordTiles() {
  const { word, letters, slots, slotsEl, lettersEl } = Game.puzzle;
  slotsEl.innerHTML = '';
  for (let i = 0; i < word.length; i++) {
    const filled = slots[i] !== undefined;
    const slot = document.createElement('button');
    slot.className = 'word-tile' + (filled ? '' : ' word-tile-empty');
    slot.textContent = filled ? letters[slots[i]] : '';
    slot.addEventListener('click', () => {
      if (filled) { slots.splice(i, 1); renderWordTiles(); }
    });
    slotsEl.appendChild(slot);
  }
  lettersEl.innerHTML = '';
  letters.forEach((ch, i) => {
    const used = slots.includes(i);
    const tile = document.createElement('button');
    tile.className = 'word-tile' + (used ? ' word-tile-used' : '');
    tile.textContent = ch;
    tile.disabled = used;
    tile.addEventListener('click', () => {
      if (used || slots.length >= word.length) return;
      slots.push(i);
      renderWordTiles();
    });
    lettersEl.appendChild(tile);
  });
}

function submitWordAnswer() {
  const { word, letters, slots } = Game.puzzle;
  if (slots.length < word.length) return;
  const attempt = slots.map((i) => letters[i]).join('');
  if (attempt === word) {
    resolvePuzzleSuccess();
  } else {
    resolvePuzzleFail();
    Game.puzzle.slots = [];
    renderWordTiles();
  }
}
