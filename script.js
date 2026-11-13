const screens = [
  "welcome",
  "library",
  "arcade",
  "garden",
  "breathing",
  "sidequests",
  "bakery",
  "order",
  "size",
  "name",
  "profile",
  "focus",
  "reward"
];

let current = "welcome";
let chosenDrink = "matcha";
let chosenTreat = "croissant";
let chosenMinutes = 25;
let chosenBooks = 1;
let sessionType = "cafe";
let remaining = 25 * 60;
let timerInterval = null;
let breathingInterval = null;
let breathingPhase = "inhale";
let breathingSecondsRemaining = 4;
let completedBreaths = 0;
let breathingFinished = false;
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
  matcha: "matcha",
  cappuccino: "☕",
  latte: "latte",
  mocha: "coffee jelly",
  "black tea": "boba",
  boba: "boba",
  "coffee jelly": "coffee jelly"
};

const drinkImages = {
  matcha: "matcha.png",
  latte: "latte.png",
  mocha: "coffeejelly.png",
  "coffee jelly": "coffeejelly.png",
  "black tea": "boba.png",
  boba: "boba.png"
};

const bakeryTreats = {
  croissant: "🥐",
  cookie: "🍪",
  muffin: "🧁"
};

function createDrinkAsset(drinkName) {
  const key = drinkName || "matcha";
  const icon = drinkEmoji[key] || drinkEmoji.matcha;
  const imagePath = drinkImages[key] || drinkImages.matcha;

  if (drinkImages[key] || drinkImages[drinkEmoji[key]]) {
    const image = document.createElement("img");
    image.src = imagePath;
    image.alt = key;
    image.className = "drink-asset";
    return image;
  }

  return document.createTextNode(icon);
}

function createTreatAsset(treatName) {
  return document.createTextNode(bakeryTreats[treatName] || bakeryTreats.croissant);
}

function getSelectionScreen() {
  return sessionType === "bakery" ? "bakery" : "order";
}

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

function syncDrinkDisplay() {
  const asset = sessionType === "bakery"
    ? createTreatAsset(chosenTreat)
    : createDrinkAsset(chosenDrink);
  const chosenArt = document.getElementById("chosenArt");
  if (chosenArt) {
    chosenArt.replaceChildren(asset.cloneNode(true));
  }

  const focusDrink = document.getElementById("focusDrink");
  if (focusDrink) {
    focusDrink.replaceChildren(asset);
  }
}

function syncFocusTableDisplay() {
  const focusDrink = document.getElementById("focusDrink");
  const focusScreen = document.getElementById("focus");
  if (!focusDrink || !focusScreen) {
    return;
  }

  const isLibrarySession = sessionType === "library";
  focusScreen.classList.toggle("library-session", isLibrarySession);
  focusDrink.classList.toggle("books-display", isLibrarySession);
  focusDrink.classList.toggle("bakery-display", sessionType === "bakery");
  focusDrink.replaceChildren();

  if (isLibrarySession) {
    for (let index = 0; index < chosenBooks; index++) {
      const book = document.createElement("span");
      book.className = "focus-book";
      book.setAttribute("aria-hidden", "true");
      focusDrink.append(book);
    }

    focusDrink.setAttribute(
      "aria-label",
      `${chosenBooks} book${chosenBooks === 1 ? "" : "s"}`
    );
    return;
  }

  const changeDrinkButton = document.getElementById("changeDrink");
  if (changeDrinkButton) {
    changeDrinkButton.textContent = sessionType === "bakery" ? "🥐" : "☕";
    changeDrinkButton.title = sessionType === "bakery" ? "Change treat" : "Change drink";
  }

  if (sessionType === "bakery") {
    focusDrink.replaceChildren(createTreatAsset(chosenTreat));
    focusDrink.setAttribute("aria-label", `${chosenTreat} treat`);
    return;
  }

  focusDrink.replaceChildren(createDrinkAsset(chosenDrink));
  focusDrink.setAttribute("aria-label", `${chosenDrink} drink`);
}

function setDrink(drink) {
  chosenDrink = drink;

  document
    .querySelectorAll("#drinkGrid .drink")
    .forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.drink === drink
      );
    });

  syncDrinkDisplay();

  const drinkNext = document.getElementById("drinkNext");
  if (drinkNext) {
    drinkNext.disabled = false;
    drinkNext.textContent = "next";
  }
}

function setTreat(treat) {
  chosenTreat = treat;

  document.querySelectorAll(".bakery-treat").forEach(button => {
    button.classList.toggle("selected", button.dataset.treat === treat);
  });

  syncDrinkDisplay();
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
    pauseBtn.textContent = "ll";
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
  if (id !== "breathing") {
    stopBreathing();
  }

  screens.forEach(screen => {
    const el = document.getElementById(screen);
    if (el) {
      el.classList.toggle("hidden", screen !== id);
    }
  });

  current = id;
}

function getMainTask() {
  return document.getElementById("taskMainInput")?.value.trim() || "finish the draft";
}

function updateTaskDisplay() {
  const goalInput = document.getElementById("goalInput");
  if (goalInput) {
    goalInput.value = getMainTask();
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
  chosenBooks = 1;
  remaining = 25 * 60;
  paused = false;

  document.querySelectorAll(".size-option").forEach(option => {
    option.classList.toggle("selected", Number(option.dataset.minutes) === 25);
    option.setAttribute("aria-expanded", "false");
  });
  document.getElementById("cafeCustomTime").hidden = true;
  document.getElementById("cafeCustomMinutes").value = "30";
  document.querySelectorAll(".book-option").forEach((option, index) => {
    option.classList.toggle("selected", index === 0);
    option.setAttribute("aria-expanded", "false");
  });
  document.getElementById("libraryCustomTime").hidden = true;
  document.getElementById("libraryCustomMinutes").value = "30";
  document.getElementById("librarySummary").textContent =
    "1 book = 15 minutes of focused reading";
  document.getElementById("libraryNext").disabled = false;

  const drinkButtons = document.querySelectorAll("#drinkGrid .drink");
  drinkButtons.forEach(button => {
    button.classList.toggle("selected", button.dataset.drink === chosenDrink);
  });

  document.querySelectorAll(".bakery-treat").forEach(button => {
    button.classList.toggle("selected", button.dataset.treat === chosenTreat);
  });

  const drinkNext = document.getElementById("drinkNext");
  if (drinkNext) {
    drinkNext.disabled = false;
    drinkNext.textContent = "next";
  }

  syncDrinkDisplay();

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
    garden: "garden",
    bakery: "bakery"
  };

  if (shopName === "cafe") {
    sessionType = "cafe";
    document.getElementById("sizeBack").dataset.back = "order";
  } else if (shopName === "bakery") {
    sessionType = "bakery";
    document.getElementById("sizeBack").dataset.back = "bakery";
    setTreat(chosenTreat);
  }

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

const gardenMessages = {
  stretch: "Roll your shoulders gently, then reach up and stretch."
};

const gardenChoices = document.getElementById("gardenChoices");
if (gardenChoices) {
  gardenChoices.querySelectorAll(".shop-choice").forEach(button => {
    button.addEventListener("click", () => {
      gardenChoices.querySelectorAll(".shop-choice").forEach(choice => {
        const selected = choice === button;
        choice.classList.toggle("selected", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });

      const choice = button.dataset.choice;
      if (choice === "breathe") {
        resetBreathing();
        show("breathing");
        startBreathing();
      } else if (choice === "outside") {
        renderSidequests();
        show("sidequests");
      } else {
        document.getElementById("gardenMessage").textContent = gardenMessages[choice];
      }
    });
  });
}

function updateBreathingDisplay() {
  const phase = document.getElementById("breathingPhase");
  const countdown = document.getElementById("breathingCountdown");
  const round = document.getElementById("breathingRound");
  const orb = document.getElementById("breathingOrb");

  if (phase) {
    phase.textContent = breathingFinished
      ? "lovely work"
      : breathingPhase === "inhale" ? "breathe in" : "breathe out";
  }
  if (countdown) {
    countdown.textContent = breathingFinished ? "✓" : breathingSecondsRemaining;
  }
  if (round) {
    round.textContent = breathingFinished
      ? "your garden break is complete"
      : `breath ${completedBreaths + 1} of 3`;
  }
  if (orb) {
    orb.classList.toggle("breathing-in", !breathingFinished && breathingPhase === "inhale");
    orb.classList.toggle("breathing-out", !breathingFinished && breathingPhase === "exhale");
    orb.classList.toggle("breathing-done", breathingFinished);
  }
}

function stopBreathing() {
  if (breathingInterval !== null) {
    clearInterval(breathingInterval);
    breathingInterval = null;
  }
}

function resetBreathing() {
  stopBreathing();
  breathingPhase = "inhale";
  breathingSecondsRemaining = 4;
  completedBreaths = 0;
  breathingFinished = false;
  document.getElementById("breathingPause").textContent = "pause";
  updateBreathingDisplay();
}

function startBreathing() {
  if (breathingInterval !== null || breathingFinished) {
    return;
  }

  const pauseButton = document.getElementById("breathingPause");
  pauseButton.textContent = "pause";
  breathingInterval = setInterval(() => {
    breathingSecondsRemaining--;

    if (breathingSecondsRemaining <= 0) {
      if (breathingPhase === "inhale") {
        breathingPhase = "exhale";
        breathingSecondsRemaining = 6;
      } else {
        completedBreaths++;
        if (completedBreaths >= 3) {
          breathingFinished = true;
          stopBreathing();
          pauseButton.textContent = "back to garden";
        } else {
          breathingPhase = "inhale";
          breathingSecondsRemaining = 4;
        }
      }
    }

    updateBreathingDisplay();
  }, 1000);
}

document.getElementById("breathingPause").addEventListener("click", () => {
  if (breathingFinished) {
    show("garden");
  } else if (breathingInterval !== null) {
    stopBreathing();
    document.getElementById("breathingPause").textContent = "resume";
  } else {
    startBreathing();
  }
});

const natureSidequests = [
  "Find a blade of grass and admire it without picking it.",
  "Reach toward a tree from the ground—no climbing needed.",
  "Sketch a rock or leaf, and leave it where you found it.",
  "Spot three different shades of green nearby.",
  "Listen quietly and count how many different nature sounds you hear.",
  "Find a cloud that looks like something fun.",
  "Notice a tiny detail on a plant, like a vein or a new bud.",
  "Take three slow steps and notice how the ground feels beneath your feet."
];

function renderSidequests() {
  const list = document.getElementById("sidequestList");
  const shuffledQuests = [...natureSidequests];

  for (let index = shuffledQuests.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledQuests[index], shuffledQuests[swapIndex]] =
      [shuffledQuests[swapIndex], shuffledQuests[index]];
  }

  list.replaceChildren();
  shuffledQuests.slice(0, 4).forEach((quest, index) => {
    const item = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");

    checkbox.type = "checkbox";
    checkbox.id = `sidequest-${index}`;
    text.textContent = quest;
    checkbox.addEventListener("change", () => {
      item.classList.toggle("completed", checkbox.checked);
    });

    label.htmlFor = checkbox.id;
    label.append(checkbox, text);
    item.append(label);
    list.append(item);
  });
}

document.getElementById("newSidequests").addEventListener("click", renderSidequests);

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
    option.setAttribute("aria-expanded", "false");
  });

  chosenMinutes = minutes;
  chosenBooks = books;
  remaining = minutes * 60;
  updateTime();

  if (librarySummary) {
    librarySummary.textContent = `${books} book${books > 1 ? "s" : ""} = ${minutes} minutes of focused reading`;
  }
}

function isValidCustomMinutes(input) {
  const minutes = Number(input.value);
  return input.value.trim() !== "" &&
    Number.isInteger(minutes) &&
    minutes >= Number(input.min) &&
    minutes <= Number(input.max);
}

const libraryCustomTime = document.getElementById("libraryCustomTime");
const libraryCustomMinutes = document.getElementById("libraryCustomMinutes");
const libraryCustomOption = document.querySelector('.book-option[data-custom="true"]');

function updateLibraryCustomTime() {
  const valid = isValidCustomMinutes(libraryCustomMinutes);
  libraryNext.disabled = !valid;

  if (valid) {
    chosenMinutes = Number(libraryCustomMinutes.value);
    remaining = chosenMinutes * 60;
    updateTime();
    librarySummary.textContent = `Your open reading session = ${chosenMinutes} minutes`;
  } else {
    librarySummary.textContent = "Enter a whole number from 1 to 1,440 minutes";
  }
}

if (libraryCustomOption) {
  libraryCustomOption.addEventListener("click", () => {
    libraryButtons.forEach(option => {
      option.classList.toggle("selected", option === libraryCustomOption);
      option.setAttribute("aria-expanded", String(option === libraryCustomOption));
    });
    libraryCustomTime.hidden = false;
    chosenBooks = 1;
    libraryNext.disabled = false;
    updateLibraryCustomTime();
    libraryCustomMinutes.focus();
  });
}

libraryCustomMinutes.addEventListener("input", () => {
  if (libraryCustomOption.classList.contains("selected")) {
    updateLibraryCustomTime();
  }
});

if (libraryButtons.length) {
  libraryButtons.forEach(button => {
    if (button === libraryCustomOption) {
      return;
    }

    button.addEventListener("click", () => {
      libraryCustomTime.hidden = true;
      libraryNext.disabled = false;
      libraryButtons.forEach(option => option.setAttribute("aria-expanded", "false"));
      updateLibrarySelection(button);
    });
  });
}

const libraryNext = document.getElementById("libraryNext");
if (libraryNext) {
  libraryNext.addEventListener("click", () => {
    const selectedBooks = document.querySelector(".book-option.selected");
    const isCustom = selectedBooks?.dataset.custom === "true";
    if (isCustom && !isValidCustomMinutes(libraryCustomMinutes)) {
      libraryCustomMinutes.focus();
      return;
    }

    const books = isCustom ? 1 : Number(selectedBooks?.dataset.books || 1);
    const minutes = isCustom
      ? Number(libraryCustomMinutes.value)
      : Number(selectedBooks?.dataset.minutes || 15);

    chosenMinutes = minutes;
    chosenBooks = books;
    sessionType = "library";
    remaining = minutes * 60;
    updateTime();

    document.getElementById("receiptDrink").textContent = isCustom
      ? `OPEN READING · ${minutes} MIN`
      : `${books} BOOK${books > 1 ? "S" : ""}`;
    document.getElementById("receiptHeading").textContent = "READING FOR";
    document.getElementById("orderNumber").textContent = orderNo;
    show("name");
  });
}

// Drink Selection

document
  .querySelectorAll("#drinkGrid .drink")
  .forEach(button => {
    button.addEventListener("click", () => {
      setDrink(button.dataset.drink);
    });
  });

document.querySelectorAll(".bakery-treat").forEach(button => {
  button.addEventListener("click", () => {
    setTreat(button.dataset.treat);
  });
});

// Continue From Drink Selection

const drinkNext = document.getElementById("drinkNext");
if (drinkNext) {
  drinkNext.addEventListener("click", () => {
    if (!chosenDrink) {
      return;
    }

    sessionType = "cafe";
    const chosenArt = document.getElementById("chosenArt");
    if (chosenArt) {
      chosenArt.replaceChildren(createDrinkAsset(chosenDrink));
    }
    show("size");
  });
}

const bakeryNext = document.getElementById("bakeryNext");
if (bakeryNext) {
  bakeryNext.addEventListener("click", () => {
    sessionType = "bakery";
    document.getElementById("sizeBack").dataset.back = "bakery";
    const chosenArt = document.getElementById("chosenArt");
    if (chosenArt) {
      chosenArt.replaceChildren(createTreatAsset(chosenTreat));
    }
    show("size");
  });
}

// Duration Selection

document
  .querySelectorAll(".size-option")
  .forEach(button => {
    button.addEventListener("click", () => {
      const isCustom = button.dataset.custom === "true";

      document
        .querySelectorAll(".size-option")
        .forEach(option => {
          option.classList.toggle("selected", option === button);
          option.setAttribute("aria-expanded", String(option === button && isCustom));
        });

      document.getElementById("cafeCustomTime").hidden = !isCustom;
      if (isCustom) {
        updateCafeCustomTime();
        document.getElementById("cafeCustomMinutes").focus();
      } else {
        chosenMinutes = Number(button.dataset.minutes);
        document.getElementById("sizeNext").disabled = false;
      }
    });
  });

function updateCafeCustomTime() {
  const input = document.getElementById("cafeCustomMinutes");
  const valid = isValidCustomMinutes(input);
  document.getElementById("sizeNext").disabled = !valid;

  if (valid) {
    chosenMinutes = Number(input.value);
  }
}

document.getElementById("cafeCustomMinutes").addEventListener("input", () => {
  if (document.querySelector('.size-option[data-custom="true"]').classList.contains("selected")) {
    updateCafeCustomTime();
  }
});

// Continue From Duration Selection

const sizeNext = document.getElementById("sizeNext");
if (sizeNext) {
  sizeNext.addEventListener("click", () => {
    const customSizeSelected = document.querySelector('.size-option[data-custom="true"]').classList.contains("selected");
    if (customSizeSelected && !isValidCustomMinutes(document.getElementById("cafeCustomMinutes"))) {
      document.getElementById("cafeCustomMinutes").focus();
      return;
    }

    let sizeName;

    if (chosenMinutes === 25) {
      sizeName = "TALL";
    } else if (chosenMinutes === 45) {
      sizeName = "GRANDE";
    } else if (chosenMinutes === 60) {
      sizeName = "VENTI";
    } else if (customSizeSelected) {
      sizeName = `YOUR OWN CUP · ${chosenMinutes} MIN`;
    } else {
      sizeName = "UNLIMITED";
    }

    document.getElementById("receiptHeading").textContent =
      sessionType === "bakery" ? "TREAT FOR" : "DRINK FOR";
    document.getElementById("receiptDrink").textContent = sessionType === "bakery"
      ? `${chosenTreat.toUpperCase()} · ${sizeName}`
      : `1X ${sizeName} ${chosenDrink.toUpperCase()}`;

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

    document.getElementById("goalName").value = name;
    syncFocusTableDisplay();

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
    show(getSelectionScreen());
  });
}

// Change Drink

const changeDrinkBtn = document.getElementById("changeDrink");
if (changeDrinkBtn) {
  changeDrinkBtn.addEventListener("click", () => {
    stopTimer();
    show(getSelectionScreen());
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
    show(getSelectionScreen());
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
      show(getSelectionScreen());
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