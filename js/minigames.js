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
// Guyana trivia, pitched for a ~10-12 year old player. Mirrors/extends the
// facts already established in facts.js (level intro/bonus facts and boss
// flavor text) so nothing here contradicts what the game teaches elsewhere.
const TRIVIA_POOL = [
  // geography & landmarks
  { q: "What is the capital city of Guyana?", choices: ['Georgetown', 'Bridgetown', 'Paramaribo', 'Bogota'], answer: 0 },
  { q: 'Which river drains nearly 70% of Guyana and is the longest in the country?', choices: ['Demerara', 'Essequibo', 'Berbice', 'Courantyne'], answer: 1 },
  { q: "What is the name of Guyana's famous waterfall, one of the tallest single-drop falls in the world?", choices: ['Angel Falls', 'Kaieteur Falls', 'Victoria Falls', 'Iguazu Falls'], answer: 1 },
  { q: 'About how many times taller is Kaieteur Falls than Niagara Falls?', choices: ['About half as tall', 'About the same height', 'Almost 5 times taller', '20 times taller'], answer: 2 },
  { q: 'Which river gave its name to a famous type of brown sugar?', choices: ['Essequibo', 'Demerara', 'Berbice', 'Rupununi'], answer: 1 },
  { q: 'Which mountains split the Rupununi Savannah into a North and South half?', choices: ['Pakaraima Mountains', 'Kanuku Mountains', 'Andes Mountains', 'Blue Mountains'], answer: 1 },
  { q: 'Which forest is famous for its canopy walkway high above the treetops?', choices: ['Iwokrama Forest', 'Amazon Rainforest', 'Kanuku Forest', 'Mangrove Forest'], answer: 0 },
  { q: 'What makes Shell Beach so important?', choices: ['Its golden sand dunes', 'Sea turtles nest there', 'Its coral reefs', 'A famous lighthouse'], answer: 1 },
  { q: 'Which ocean borders Guyana to the north?', choices: ['Pacific Ocean', 'Caribbean Sea', 'Atlantic Ocean', 'Indian Ocean'], answer: 2 },
  { q: 'Which of these countries does NOT share a border with Guyana?', choices: ['Venezuela', 'Brazil', 'Suriname', 'Colombia'], answer: 3 },
  { q: 'Guyana is sometimes nicknamed "The Land of Many..." what?', choices: ['Mountains', 'Waters', 'Deserts', 'Islands'], answer: 1 },
  { q: "Georgetown sits below sea level thanks to a Sea Wall first built by engineers from which country?", choices: ['The Dutch', 'The French', 'The Spanish', 'The Portuguese'], answer: 0 },
  { q: "What is the name of Georgetown's famous market with the iconic clock tower?", choices: ['Stabroek Market', 'Bourda Market', 'Kitty Market', 'Bel Air Market'], answer: 0 },
  { q: 'The Kanuku Mountains are considered one of the most... what... places on the planet?', choices: ['Rainy', 'Biodiverse', 'Rocky', 'Cold'], answer: 1 },
  { q: "What is the Essequibo River dotted with, some big enough to have their own villages?", choices: ['Waterfalls', 'Islands', 'Bridges', 'Lighthouses'], answer: 1 },
  // culture, history & people
  { q: 'What is Guyana\'s flag nicknamed?', choices: ['The Golden Arrowhead', 'The Rising Sun', 'The Green Star', 'The Silver Wave'], answer: 0 },
  { q: 'Which continent is Guyana located on?', choices: ['Africa', 'South America', 'Asia', 'Central America'], answer: 1 },
  { q: 'What was Guyana called before it became independent in 1966?', choices: ['British Guiana', 'French Guiana', 'Dutch Suriname', 'New Holland'], answer: 0 },
  { q: 'What is the official language of Guyana?', choices: ['Spanish', 'Portuguese', 'English', 'French'], answer: 2 },
  { q: "What is Guyana's currency called?", choices: ['Guyanese Dollar', 'Guyanese Pound', 'Guyanese Peso', 'Guyanese Real'], answer: 0 },
  { q: "What is Guyana's national bird, also known as the Canje Pheasant?", choices: ['Harpy Eagle', 'Hoatzin', 'Toucan', 'Scarlet Macaw'], answer: 1 },
  { q: "What is Guyana's national flower, a giant water lily?", choices: ['Victoria Regia', 'Rose', 'Orchid', 'Sunflower'], answer: 0 },
  { q: "About how many different Indigenous peoples call Guyana's interior home?", choices: ['Three', 'Six', 'Nine', 'Twelve'], answer: 2 },
  { q: "What are Guyana's traditional small-scale gold and diamond miners called?", choices: ['Bushmen', 'Pork-knockers', 'Prospectors', 'Trailblazers'], answer: 1 },
  { q: "What root vegetable is a staple food in Guyana's interior, often baked into bread?", choices: ['Potato', 'Cassava', 'Carrot', 'Beet'], answer: 1 },
  { q: 'What do interior travelers sleep in when they set up a bush camp?', choices: ['Tents', 'Hammocks', 'Sleeping bags', 'Cabins'], answer: 1 },
  { q: "Which big cat appears on Guyana's Coat of Arms?", choices: ['Lion', 'Jaguar', 'Tiger', 'Leopard'], answer: 1 },
  { q: 'Besides gold and diamonds, what else is Guyana well known for mining?', choices: ['Coal', 'Bauxite', 'Iron only', 'Salt'], answer: 1 },
  { q: 'What are the cattle ranchers of the Rupununi Savannah traditionally called?', choices: ['Cowboys', 'Vaqueros', 'Gauchos', 'Rustlers'], answer: 1 },
  // wildlife & nature
  { q: "What is the world's largest scaled freshwater fish, found in Guyana's rivers?", choices: ['Piranha', 'Arapaima', 'Catfish', 'Electric Eel'], answer: 1 },
  { q: 'What is the largest rodent in the world, found in Guyana?', choices: ['Capybara', 'Beaver', 'Groundhog', 'Porcupine'], answer: 0 },
  { q: "Which powerful big cat prowls Guyana's forests and savannahs?", choices: ['Lion', 'Jaguar', 'Tiger', 'Cheetah'], answer: 1 },
  { q: 'How long can a giant river otter in Guyana grow?', choices: ['Up to 1.8 meters', 'Up to 30 centimeters', 'Up to 5 meters', 'Up to 1 meter'], answer: 0 },
  { q: 'Which powerful eagle, one of the largest in the world, nests in the Kanuku Mountains?', choices: ['Bald Eagle', 'Harpy Eagle', 'Golden Eagle', 'Sea Eagle'], answer: 1 },
  { q: 'Which sea turtles nest at Shell Beach and can grow larger than a bathtub?', choices: ['Snapping turtles', 'Leatherback turtles', 'Box turtles', 'Painted turtles'], answer: 1 },
  { q: 'What lights up Rupununi nights like tiny floating lanterns?', choices: ['Stars', 'Fireflies', 'Lightning', 'Fireworks'], answer: 1 },
  { q: 'What kind of frog lives in the giant tank bromeliads near Kaieteur Falls?', choices: ['Golden frogs', 'Poison frogs', 'Tree frogs', 'Bullfrogs'], answer: 0 },
  { q: 'How many eggs can a mother sea turtle lay in a single nest at Shell Beach?', choices: ['About 5', 'Over 80', 'About 20', 'Just 1'], answer: 1 },
  { q: "What are baby sea turtles called, hatching from nests on Shell Beach?", choices: ['Cubs', 'Hatchlings', 'Joeys', 'Pups'], answer: 1 },
  // folklore (the game's five bosses)
  { q: 'In Guyanese folklore, what does Ole Higue shed at night before flying as a ball of fire?', choices: ['Her shadow', 'Her skin', 'Her voice', 'Her shoes'], answer: 1 },
  { q: 'What can you leave by the door to stop Ole Higue, since she must stop and count every one?', choices: ['Coins', 'Salt or rice', 'Flowers', 'Candles'], answer: 1 },
  { q: 'What is Massacooraman said to be in Guyanese folklore?', choices: ['A tiny river fairy', 'A huge river giant', 'A talking fish', 'A friendly dolphin'], answer: 1 },
  { q: 'What does Massacooraman guard, according to legend?', choices: ["Guyana's mountains", "Guyana's waterways", "Guyana's forests", "Guyana's caves"], answer: 1 },
  { q: 'What are Moongazers said to do at crossroads?', choices: ['Dance all night', 'Stand silently staring at the moon', 'Sing loudly', 'Chase travelers'], answer: 1 },
  { q: 'How tall are Moongazers said to be in folklore?', choices: ["So short you'd step over them", "So tall you could walk between their legs", 'Exactly human height', 'The size of a house'], answer: 1 },
  { q: 'Where is a Baccoo traditionally said to be kept?', choices: ['In a tree', 'In a bottle', 'In a cave', 'Under a bed'], answer: 1 },
  { q: 'What is a Baccoo traditionally fed to keep it happy?', choices: ['Milk and bananas', 'Bread and water', 'Meat and rice', 'Honey and nuts'], answer: 0 },
  { q: 'What animal does Kanaima take the form of to deliver justice, according to Indigenous legend?', choices: ['A snake', 'A jaguar', 'An eagle', 'A crocodile'], answer: 1 },
  { q: 'What does Kanaima represent in Indigenous Guyanese tradition?', choices: ['Mischief and tricks', 'Balance and justice', 'Bad luck', 'Good fortune'], answer: 1 },
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

// Escape hatch for a puzzle the player genuinely can't crack: costs a real
// life (same currency as getting hit by a hazard/enemy), same as the
// wrong-answer penalty is a real but small score/time cost. Deliberately
// does NOT call triggerDeath()/respawnPlayer() -- the player isn't "dying",
// they're paying to skip, so they stay exactly where they are and the gate
// just opens. If that was their last life, it defers to the same
// game-over/continue flow a normal death would trigger.
function skipPuzzleForLife() {
  if (!Game.puzzle) return;
  const gate = Game.puzzle.gate;
  const returnTo = Game.prevState || 'playing';
  Game.lives--;
  Game.puzzle = null;
  if (Game.lives <= 0) {
    triggerGameOver();
  } else {
    gate.open = true;
    setState(returnTo);
    showToast('Gate skipped -- lost a life', 2.4);
  }
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
