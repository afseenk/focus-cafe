const screens = [
  "welcome",
  "library",
  "arcade",
  "order",
  "size",
  "name",
  "profile",
  "focus",
  "reward"
];

let current = "welcome";
let chosenDrink = "matcha";
let chosenMinutes = 25;
let remaining = 25 * 60;
let timerInterval = null;
let paused = false;
let musicEnabled = false;
let audioContext = null;
let musicOscillators = [];

let orderNo = Math.floor(
  100 + Math.random() * 900
);

const defaultProfile = {
  name: "your café",
  favoriteDrink: "matcha",
  vibe: "calm"
};

let cafeProfile = {
  ...defaultProfile
};

const drinkEmoji = {
  americano: "☕",
  matcha: "🥤",
  cappuccino: "☕",
  latte: "🥛",
  mocha: "☕",
  "black tea": "🍵"
};

const profileKey = "focusCafeProfile";

function loadProfile() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(profileKey) || "null"
    );

    if (saved) {
      cafeProfile = {
        ...defaultProfile,
        ...saved
      };
    }
  } catch (error) {
    console.warn("Profile load failed", error);
  }
}

function saveProfile() {
  localStorage.setItem(
    profileKey,
    JSON.stringify(cafeProfile)
  );
}

function applyProfileToUI() {
  const welcomeName = document.getElementById("welcomeCafeName");

  if (welcomeName) {
    welcomeName.textContent = cafeProfile.name;
  }
}

function applyTimeOfDayTheme() {
  const hour = new Date().getHours();
  let time = "morning";

  if (hour >= 6 && hour < 12) {
    time = "morning";
  } else if (hour >= 12 && hour < 17) {
    time = "afternoon";
  } else if (hour >= 17 && hour < 21) {
    time = "evening";
  } else {
    time = "night";
  }

  document.body.dataset.timeOfDay = time;
}

function setDrink(drink) {
  chosenDrink = drink;

  document
    .querySelectorAll(".drink")
    .forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.drink === drink
      );
    });

  const drinkNext = document.getElementById("drinkNext");
  if (drinkNext) {
    drinkNext.disabled = false;
    drinkNext.textContent = "next";
  }
}

function updateTime() {
  const m = Math.floor(
    remaining / 60
  ).toString().padStart(2, "0");

  const s = (
    remaining % 60
  ).toString().padStart(2, "0");

  const timer = document.getElementById("timer");
  if (timer) {
    timer.textContent = `${m}:${s}`;
  }
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function finishSession() {
  stopTimer();
  document.getElementById("timer").textContent = "00:00";
  show("reward");
}

function startTimer() {
  stopTimer();

  paused = false;

  const pauseBtn = document.getElementById("pauseBtn");
  if (pauseBtn) {
    pauseBtn.textContent = "Ⅱ";
  }

  if (chosenMinutes === 0) {
    return;
  }

  timerInterval = setInterval(() => {
    if (!paused && remaining > 0) {
      remaining--;
      updateTime();
    }

    if (remaining <= 0) {
      finishSession();
    }
  }, 1000);
}

function show(id) {
  screens.forEach(screen => {
    const el = document.getElementById(screen);
    if (el) {
      el.classList.toggle("hidden", screen !== id);
    }
  });

  current = id;
}

function collectTasks() {
  const tasks = [
    document.getElementById("taskMainInput")?.value.trim() || "",
    document.getElementById("taskBonusInput")?.value.trim() || "",
    document.getElementById("taskExtraInput")?.value.trim() || ""
  ].filter(Boolean);

  return tasks.length
    ? tasks
    : ["finish the draft", "review notes", "prep tomorrow"];
}

function updateTaskDisplay() {
  const tasks = collectTasks();
  const main = document.getElementById("taskMainDisplay");
  const bonus = document.getElementById("taskBonusDisplay");
  const extra = document.getElementById("taskExtraDisplay");

  if (main) {
    main.textContent = tasks[0] || "finish the draft";
  }

  if (bonus) {
    bonus.textContent = tasks[1] || "review notes";
  }

  if (extra) {
    extra.textContent = tasks[2] || "prep tomorrow";
  }

  const goalInput = document.getElementById("goalInput");
  if (goalInput) {
    goalInput.value = tasks[0] || "write your goal";
  }
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;

    audioContext = new AudioCtor();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.02;
    gainNode.connect(audioContext.destination);

    musicOscillators = [
      { type: "sine", frequency: 196, gain: 0.016 },
      { type: "triangle", frequency: 261.63, gain: 0.012 }
    ].map(({ type, frequency, gain }) => {
      const osc = audioContext.createOscillator();
      const oscGain = audioContext.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      oscGain.gain.value = gain;
      osc.connect(oscGain);
      oscGain.connect(gainNode);
      osc.start();
      return { osc, oscGain };
    });
  }

  return audioContext;
}

function toggleMusic() {
  const musicButton = document.getElementById("musicToggle");
  const context = ensureAudioContext();

  if (!context) {
    musicButton.textContent = "audio unavailable";
    return;
  }

  musicEnabled = !musicEnabled;

  if (musicEnabled) {
    context.resume();
    musicButton.textContent = "music on";
  } else {
    context.suspend();
    musicButton.textContent = "audio-free experience";
  }
}

function resetSessionFlow() {
  chosenDrink = cafeProfile.favoriteDrink || "matcha";
  chosenMinutes = 25;
  remaining = 25 * 60;
  paused = false;

  document.querySelectorAll(".size-option").forEach(option => {
    option.classList.toggle("selected", Number(option.dataset.minutes) === 25);
  });

  const drinkButtons = document.querySelectorAll(".drink");
  drinkButtons.forEach(button => {
    button.classList.toggle("selected", button.dataset.drink === chosenDrink);
  });

  if (document.getElementById("goalInput")) {
    document.getElementById("goalInput").value = "write your goal";
  }

  updateTime();
}

// Welcome Screen

function openShop(shopName) {
  const destinations = {
    cafe: "order",
    library: "library",
    arcade: "arcade",
    studio: "profile"
  };

  const target = destinations[shopName] || "welcome";
  show(target);
}

function goToStreetMap() {
  show("welcome");

  const streetScene = document.getElementById("streetScroll");
  if (streetScene) {
    streetScene.scrollTo({ left: 0, behavior: "smooth" });
  }
}

const streetShops = document.querySelectorAll(".shop");
if (streetShops.length) {
  streetShops.forEach(shop => {
    shop.addEventListener("click", () => {
      openShop(shop.dataset.shop);
    });

    shop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openShop(shop.dataset.shop);
      }
    });
  });
}

const streetMapBtn = document.getElementById("streetMapBtn");
if (streetMapBtn) {
  streetMapBtn.addEventListener("click", goToStreetMap);
}

const musicToggle = document.getElementById("musicToggle");
if (musicToggle) {
  musicToggle.addEventListener("click", toggleMusic);
}

// Library Study Selection

const librarySummary = document.getElementById("librarySummary");
const libraryButtons = document.querySelectorAll(".book-option");

function updateLibrarySelection(button) {
  if (!button) {
    return;
  }

  const books = Number(button.dataset.books);
  const minutes = Number(button.dataset.minutes);

  libraryButtons.forEach(option => {
    option.classList.toggle("selected", option === button);
  });

  chosenMinutes = minutes;
  remaining = minutes * 60;
  updateTime();

  if (librarySummary) {
    librarySummary.textContent = `${books} book${books > 1 ? "s" : ""} = ${minutes} minutes of focused reading`;
  }
}

if (libraryButtons.length) {
  libraryButtons.forEach(button => {
    button.addEventListener("click", () => {
      updateLibrarySelection(button);
    });
  });
}

const libraryNext = document.getElementById("libraryNext");
if (libraryNext) {
  libraryNext.addEventListener("click", () => {
    const selectedBooks = document.querySelector(".book-option.selected");
    const books = Number(selectedBooks?.dataset.books || 1);
    const minutes = Number(selectedBooks?.dataset.minutes || 15);

    chosenMinutes = minutes;
    remaining = minutes * 60;
    updateTime();

    document.getElementById("receiptDrink").textContent = `${books} BOOK${books > 1 ? "S" : ""}`;
    document.getElementById("orderNumber").textContent = orderNo;
    show("name");
  });
}

// Drink Selection

document
  .querySelectorAll(".drink")
  .forEach(button => {
    button.addEventListener("click", () => {
      setDrink(button.dataset.drink);
    });
  });

// Continue From Drink Selection

const drinkNext = document.getElementById("drinkNext");
if (drinkNext) {
  drinkNext.addEventListener("click", () => {
    if (!chosenDrink) {
      return;
    }

    document.getElementById("chosenArt").textContent = drinkEmoji[chosenDrink];
    show("size");
  });
}

// Duration Selection

document
  .querySelectorAll(".size-option")
  .forEach(button => {
    button.addEventListener("click", () => {
      chosenMinutes = Number(button.dataset.minutes);

      document
        .querySelectorAll(".size-option")
        .forEach(option => {
          option.classList.toggle("selected", option === button);
        });
    });
  });

// Continue From Duration Selection

const sizeNext = document.getElementById("sizeNext");
if (sizeNext) {
  sizeNext.addEventListener("click", () => {
    let sizeName;

    if (chosenMinutes === 25) {
      sizeName = "TALL";
    } else if (chosenMinutes === 45) {
      sizeName = "GRANDE";
    } else if (chosenMinutes === 60) {
      sizeName = "VENTI";
    } else {
      sizeName = "UNLIMITED";
    }

    document.getElementById("receiptDrink").textContent =
      `1X ${sizeName} ${chosenDrink.toUpperCase()}`;

    document.getElementById("orderNumber").textContent = orderNo;

    show("name");
  });
}

// Back Buttons

document
  .querySelectorAll(".back-link")
  .forEach(button => {
    button.addEventListener("click", () => {
      show(button.dataset.back);
    });
  });

// Save profile

const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", () => {
    cafeProfile = {
      ...defaultProfile
    };

    saveProfile();
    applyProfileToUI();
    show("welcome");
  });
}

// Profile opener

const profileBtn = document.getElementById("profileBtn");
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    applyProfileToUI();
    show("profile");
  });
}

// Start Focus Session

const startBtn = document.getElementById("startBtn");
if (startBtn) {
  startBtn.addEventListener("click", () => {
    const name = document.getElementById("nameInput").value.trim() || "friend";
    const tasks = collectTasks();

    document.getElementById("goalName").value = name;
    document.getElementById("focusDrink").textContent = drinkEmoji[chosenDrink];

    updateTaskDisplay();

    remaining = chosenMinutes === 0 ? 0 : chosenMinutes * 60;
    updateTime();

    show("focus");
    startTimer();

    if (chosenMinutes === 0) {
      document.getElementById("timer").textContent = "∞";
    }
  });
}

// Pause and Resume Timer

const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    if (chosenMinutes === 0) {
      return;
    }

    paused = !paused;
    pauseBtn.textContent = paused ? "▶" : "Ⅱ";
  });
}

// Reset Timer

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    remaining = chosenMinutes * 60;
    updateTime();

    if (chosenMinutes === 0) {
      document.getElementById("timer").textContent = "∞";
    }
  });
}

// Previous Screen

const prevBtn = document.getElementById("prevBtn");
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    stopTimer();
    show("name");
  });
}

// Next Screen

const nextBtn = document.getElementById("nextBtn");
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    stopTimer();
    show("order");
  });
}

// Change Drink

const changeDrinkBtn = document.getElementById("changeDrink");
if (changeDrinkBtn) {
  changeDrinkBtn.addEventListener("click", () => {
    stopTimer();
    show("order");
  });
}

// Focus Button

const focusMode = document.getElementById("focusMode");
if (focusMode) {
  focusMode.addEventListener("click", () => {
    const goalInput = document.getElementById("goalInput");
    if (goalInput) {
      goalInput.focus();
    }
  });
}

// Reward screen

const rewardBack = document.getElementById("rewardBack");
if (rewardBack) {
  rewardBack.addEventListener("click", () => {
    resetSessionFlow();
    show("order");
  });
}

document.querySelectorAll(".reward-option").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    const chosen = action === "stretch"
      ? "stretch"
      : action === "walk"
        ? "walk"
        : "tea refill";

    button.textContent = `${chosen} ✓`;
    setTimeout(() => {
      resetSessionFlow();
      show("order");
    }, 300);
  });
});

function createTicTacToeGame() {
  const cells = [...document.querySelectorAll(".ttt-cell")];
  const status = document.getElementById("tttStatus");
  let board = Array(9).fill("");
  let currentTurn = "X";
  let isFinished = false;

  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function updateBoard() {
    cells.forEach((cell, index) => {
      cell.textContent = board[index];
      cell.disabled = !!board[index] || isFinished;
    });
  }

  function checkWinner() {
    for (const [a, b, c] of winningLines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        isFinished = true;
        status.textContent = `player ${board[a]} wins!`;
        updateBoard();
        return true;
      }
    }

    if (board.every(Boolean)) {
      isFinished = true;
      status.textContent = "draw game";
      updateBoard();
      return true;
    }

    return false;
  }

  function handleCellClick(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (board[index] || isFinished) {
      return;
    }

    board[index] = currentTurn;
    updateBoard();

    if (checkWinner()) {
      return;
    }

    currentTurn = currentTurn === "X" ? "O" : "X";
    status.textContent = `player ${currentTurn} turn`;
  }

  cells.forEach(cell => {
    cell.addEventListener("click", handleCellClick);
  });

  function reset() {
    board = Array(9).fill("");
    currentTurn = "X";
    isFinished = false;
    status.textContent = "player X turn";
    updateBoard();
  }

  document.querySelector('[data-game="ttt"]').addEventListener("click", reset);
  updateBoard();
}

function createMemoryGame() {
  const board = document.getElementById("memoryBoard");
  const status = document.getElementById("memoryStatus");
  const symbols = ["☕", "📚", "🎮", "🎧", "🧠", "✨", "🌙", "🍵"];
  let deck = [];
  let flipped = [];
  let matched = 0;
  let lockBoard = false;

  function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  function reset() {
    deck = shuffle([...symbols, ...symbols]);
    flipped = [];
    matched = 0;
    lockBoard = false;
    board.innerHTML = "";

    deck.forEach((symbol, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "memory-card";
      button.dataset.symbol = symbol;
      button.dataset.index = String(index);
      button.textContent = "?";
      button.addEventListener("click", () => {
        if (lockBoard || button.classList.contains("matched") || flipped.includes(index)) {
          return;
        }

        button.textContent = symbol;
        button.classList.add("revealed");
        flipped.push(index);

        if (flipped.length === 2) {
          const [firstIndex, secondIndex] = flipped;
          const firstCard = board.querySelectorAll(".memory-card")[firstIndex];
          const secondCard = board.querySelectorAll(".memory-card")[secondIndex];

          if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
            firstCard.classList.add("matched");
            secondCard.classList.add("matched");
            matched += 2;
            status.textContent = "nice match!";
            flipped = [];

            if (matched === deck.length) {
              status.textContent = "all pairs found!";
            }
          } else {
            lockBoard = true;
            status.textContent = "try again";
            setTimeout(() => {
              firstCard.textContent = "?";
              secondCard.textContent = "?";
              firstCard.classList.remove("revealed");
              secondCard.classList.remove("revealed");
              flipped = [];
              lockBoard = false;
              status.textContent = "find all the pairs";
            }, 650);
          }
        }
      });
      board.appendChild(button);
    });
  }

  document.querySelector('[data-game="memory"]').addEventListener("click", reset);
  reset();
}

function createWordleGame() {
  const wordList = ["BLOOM", "GRAPE", "COAST", "BREAD", "CANDY", "SMILE", "STEAM", "LIGHT", "DRIFT", "MUSIC", "FOCUS", "PAUSE"];
  const grid = [...document.querySelectorAll(".wordle-box")];
  const input = document.getElementById("wordleInput");
  const status = document.getElementById("wordleStatus");
  const submit = document.getElementById("wordleSubmit");

  let answer = wordList[Math.floor(Math.random() * wordList.length)];
  let row = 0;
  let column = 0;
  let finished = false;

  function renderBoard() {
    const allBoxes = [...document.querySelectorAll(".wordle-box")];
    allBoxes.forEach((box, index) => {
      const rowIndex = Math.floor(index / 5);
      const colIndex = index % 5;
      const entry = rowIndex === 0 ? "" : "";
      box.textContent = "";
      box.classList.remove("filled", "correct", "present", "absent");
    });

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const box = document.querySelectorAll(".wordle-row")[r].children[c];
        box.textContent = "";
        box.classList.remove("filled", "correct", "present", "absent");
      }
    }
  }

  function updateGuessBoard() {
    const rows = [...document.querySelectorAll(".wordle-row")];
    rows.forEach((rowElement, rowIndex) => {
      const boxes = [...rowElement.children];
      boxes.forEach((box, colIndex) => {
        const value = rowIndex === row ? (colIndex < column ? input.value[colIndex] || "" : "") : "";
        box.textContent = value;
        box.classList.toggle("filled", !!value);
      });
    });
  }

  function reset() {
    answer = wordList[Math.floor(Math.random() * wordList.length)];
    row = 0;
    column = 0;
    finished = false;
    input.value = "";
    status.textContent = "guess the 5-letter word";
    document.querySelectorAll(".wordle-row").forEach(rowElement => {
      rowElement.querySelectorAll(".wordle-box").forEach(box => {
        box.textContent = "";
        box.classList.remove("filled", "correct", "present", "absent");
      });
    });
    input.focus();
  }

  function submitGuess() {
    if (finished) {
      return;
    }

    const guess = input.value.trim().toUpperCase();
    if (!/^[A-Z]{5}$/.test(guess)) {
      status.textContent = "enter a valid 5-letter word";
      return;
    }

    const rowElement = document.querySelectorAll(".wordle-row")[row];
    const boxes = [...rowElement.children];
    const letterCounts = {};

    for (const letter of answer) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }

    boxes.forEach((box, index) => {
      const letter = guess[index];
      box.textContent = letter;
      box.classList.add("filled");

      if (letter === answer[index]) {
        box.classList.add("correct");
        letterCounts[letter] -= 1;
      }
    });

    boxes.forEach((box, index) => {
      const letter = guess[index];
      if (letter === answer[index]) {
        return;
      }

      if (answer.includes(letter) && letterCounts[letter] > 0) {
        box.classList.add("present");
        letterCounts[letter] -= 1;
      } else {
        box.classList.add("absent");
      }
    });

    if (guess === answer) {
      status.textContent = "you solved it!";
      finished = true;
      return;
    }

    row += 1;
    if (row >= 6) {
      status.textContent = `out of guesses — answer: ${answer}`;
      finished = true;
      return;
    }

    input.value = "";
    status.textContent = `guess ${row + 1} of 6`;
  }

  submit.addEventListener("click", submitGuess);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitGuess();
    }
  });

  document.querySelector('[data-game="wordle"]').addEventListener("click", reset);
  reset();
}

createTicTacToeGame();
createMemoryGame();
createWordleGame();

loadProfile();
applyProfileToUI();
applyTimeOfDayTheme();
resetSessionFlow();
updateTaskDisplay();

if (localStorage.getItem(profileKey) === null) {
  saveProfile();
}