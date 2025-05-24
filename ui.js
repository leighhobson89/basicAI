import {
  setCanvasLogScrollOffset,
  getCanvasLogScrollOffset,
  canvasLogBuffer,
  maxLogLines,
  gameState,
  getLanguage,
  setElements,
  getElements,
  setBeginGameStatus,
  getGameInProgress,
  setGameInProgress,
  getGameVisiblePaused,
  getBeginGameStatus,
  getGameVisibleActive,
  getMenuState,
  getLanguageSelected,
  setLanguageSelected,
  setLanguage,
} from "./constantsAndGlobalVars.js";
import { setGameState, startGame, gameLoop, typeLines } from "./game.js";
import { initLocalization, localize } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';

document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("userInput");
  const caret = document.getElementById("customCaret");
  const mirror = document.getElementById("inputMirror");

  setElements();

  // --- Game/UI event listeners (unchanged) ---
  getElements().newGameMenuButton.addEventListener("click", () => {
    setBeginGameStatus(true);
    if (!getGameInProgress()) {
      setGameInProgress(true);
      focusInputField();
    }
    disableActivateButton(
      getElements().resumeGameMenuButton,
      "active",
      "btn-primary"
    );
    disableActivateButton(
      getElements().saveGameButton,
      "active",
      "btn-primary"
    );
    setGameState(getGameVisiblePaused());
    startGame();
  });

  ["en", "es", "de", "it", "fr"].forEach((lang) => {
    getElements()[
      `btn${lang.charAt(0).toUpperCase() + lang.slice(1)}`
    ].addEventListener("click", () => {
      handleLanguageChange(lang);
      setGameState(getMenuState());
    });
  });

  getElements().saveGameButton.addEventListener("click", () => {
    getElements().overlay.classList.remove("d-none");
    saveGame(true);
  });

  getElements().loadGameButton.addEventListener("click", () => {
    getElements().overlay.classList.remove("d-none");
    loadGameOption();
  });

  getElements().copyButtonSavePopup.addEventListener(
    "click",
    copySaveStringToClipBoard
  );

  getElements().closeButtonSavePopup.addEventListener("click", () => {
    getElements().saveLoadPopup.classList.add("d-none");
    getElements().overlay.classList.add("d-none");
  });

  getElements().loadStringButton.addEventListener("click", () => {
    loadGame(true)
      .then(() => {
        setElements();
        getElements().saveLoadPopup.classList.add("d-none");
        document.getElementById("overlay").classList.add("d-none");
        setGameState(getMenuState());
      })
      .catch((error) => console.error("Error loading game:", error));
  });

  getElements().canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    const delta = Math.sign(event.deltaY);
    const currentOffset = getCanvasLogScrollOffset();

    const ctx = getElements().canvas.getContext("2d");
    const lineHeight = 18;
    const visibleLines = Math.floor(ctx.canvas.height / lineHeight);
    const maxOffset = Math.max(0, canvasLogBuffer.length - visibleLines);

    let newOffset = currentOffset - delta;
    if (newOffset < 0) newOffset = 0;
    if (newOffset > maxOffset) newOffset = maxOffset;

    setCanvasLogScrollOffset(newOffset);
  });

  userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const inputText = userInput.value.trim();
      if (inputText.length > 0) {
        typeLines([`> ${inputText}`]); // Animate the input text
        userInput.value = "";
        setCanvasLogScrollOffset(0);
      }
    }
  });
  

  mirror.style.font = window.getComputedStyle(input).font;

  function updateCaret() {
    const caretIndex = input.selectionStart;
    mirror.textContent = input.value.substring(0, caretIndex);
    const mirrorWidth = mirror.offsetWidth - 12;
    caret.style.left = `${mirrorWidth}px`;
    caret.style.top = `${input.offsetTop + 13}px`;
    caret.style.display = "block";
  }

  ["input", "keydown", "click", "focus"].forEach((evt) => {
    input.addEventListener(evt, updateCaret);
  });

  input.addEventListener("blur", () => {
    caret.style.display = "none";
  });

  // Optional: blinking
  setInterval(updateCaret, 500);

  input.focus();
  setGameState(getMenuState());
  handleLanguageChange(getLanguageSelected());
});
  

function focusInputField() {
  const input = document.getElementById("userInput");
  if (input) {
    // Delay ensures DOM is ready and visible
    setTimeout(() => {
      input.focus();
    }, 0);
  }
}

export function outputToCanvas(text) {
  canvasLogBuffer.push(text);
  if (canvasLogBuffer.length > maxLogLines) {
    canvasLogBuffer.shift();
  }
}  

export function renderHTMLString(ctx, x, y, html) {
  const tagRegex = /<\/?[^>]+>/g;
  const parts = html.split(tagRegex);
  const tags = html.match(tagRegex) || [];

  let currFont = "16px monospace";
  let currStyle = { bold: false, italic: false, color: "#0f0" };
  let tagIndex = 0;
  let currX = x;

  for (let i = 0; i < parts.length; i++) {
    let text = parts[i];

    ctx.font = `${currStyle.italic ? "italic " : ""}${
      currStyle.bold ? "bold " : ""
    }${currFont}`;
    ctx.fillStyle = currStyle.color;

    ctx.fillText(text, currX, y);
    currX += ctx.measureText(text).width;

    if (tagIndex < tags.length) {
      const tag = tags[tagIndex++];
      if (tag === "<b>") currStyle.bold = true;
      else if (tag === "</b>") currStyle.bold = false;
      else if (tag === "<i>") currStyle.italic = true;
      else if (tag === "</i>") currStyle.italic = false;
      else if (tag.startsWith("<span")) {
        const colorMatch = tag.match(/color:\s*([^;"]+)/);
        if (colorMatch) currStyle.color = colorMatch[1].trim();
      } else if (tag === "</span>") {
        currStyle.color = "#0f0";
      }
    }
  }
}

async function setElementsLanguageText() {
    getElements().menuTitle.innerHTML = `<h2>${localize('menuTitle', getLanguage())}</h2>`;
    getElements().newGameMenuButton.innerHTML = `${localize('newGame', getLanguage())}`;
    getElements().resumeGameMenuButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
    getElements().loadGameButton.innerHTML = `${localize('loadGame', getLanguage())}`;
    getElements().saveGameButton.innerHTML = `${localize('saveGame', getLanguage())}`;
    getElements().loadStringButton.innerHTML = `${localize('loadButton', getLanguage())}`;
}

export async function handleLanguageChange(languageCode) {
    setLanguageSelected(languageCode);
    await setupLanguageAndLocalization();
    setElementsLanguageText();
}

async function setupLanguageAndLocalization() {
    setLanguage(getLanguageSelected());
    await initLocalization(getLanguage());
}

export function disableActivateButton(button, action, activeClass) {
    switch (action) {
        case 'active':
            button.classList.remove('disabled');
            button.classList.add(activeClass);
            break;
        case 'disable':
            button.classList.remove(activeClass);
            button.classList.add('disabled');
            break;
    }
}

