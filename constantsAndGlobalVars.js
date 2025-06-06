//DEBUG
export let debugFlag = false;
export let debugOptionFlag = false;
export let stateLoading = false;

//ELEMENTS
let elements;
let localization = {};
let language = 'en';
let languageSelected = 'en';
let oldLanguage = 'en';

//CONSTANTS
export let gameState;
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_PAUSED = 'gameVisiblePaused';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';

//GLOBAL VARIABLES
export const canvasLogBuffer = [];
export const maxLogLines = 100;
export let canvasLogScrollOffset = 0;
let typingQueue = [];
let currentLine = "";
let currentCharIndex = 0;
let typingSpeed = 5;
let isTyping = false;
let cursorVisible = true;
let lastCursorToggleTime = 0;
const cursorFlashInterval = 500; // ms
const cursorWidth = 10;
const cursorHeight = 18;

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;

let autoSaveOn = false;
export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
      menu: document.getElementById("menu"),
      menuTitle: document.getElementById("menuTitle"),
      newGameMenuButton: document.getElementById("newGame"),
      resumeGameMenuButton: document.getElementById("resumeFromMenu"),
      loadGameButton: document.getElementById("loadGame"),
      saveGameButton: document.getElementById("saveGame"),
      saveLoadPopup: document.getElementById("loadSaveGameStringPopup"),
      loadSaveGameStringTextArea: document.getElementById(
        "loadSaveGameStringTextArea"
      ),
      loadStringButton: document.getElementById("loadStringButton"),
      textAreaLabel: document.getElementById("textAreaLabel"),
      returnToMenuButton: document.getElementById("returnToMenu"),
      pauseResumeGameButton: document.getElementById("resumeGame"),
      canvas: document.getElementById("canvas"),
      canvasContainer: document.getElementById("canvasContainer"),
      buttonRow: document.getElementById("buttonRow"),
      btnEn: document.getElementById("btnEnglish"),
      btnEs: document.getElementById("btnSpanish"),
      btnFr: document.getElementById("btnFrench"),
      btnDe: document.getElementById("btnGerman"),
      btnIt: document.getElementById("btnItalian"),
      copyButtonSavePopup: document.getElementById("copyButtonSavePopup"),
      closeButtonSavePopup: document.getElementById("closeButtonSavePopup"),
      overlay: document.getElementById("overlay"),
      canvas: document.getElementById("canvas"),
      userInput: document.getElementById("userInput"),
      inputContainer: document.getElementById("inputContainer"),
    };
}

export function setGameStateVariable(value) {
    gameState = value;
}

export function getGameStateVariable() {
    return gameState;
}

export function getElements() {
    return elements;
}

export function getLanguageChangedFlag() {
    return languageChangedFlag;
}

export function setLanguageChangedFlag(value) {
    languageChangedFlag = value;
}

export function resetAllVariables() {
    // GLOBAL VARIABLES

    // FLAGS
}

export function captureGameStatusForSaving() {
    let gameState = {};

    // Game variables

    // Flags

    // UI elements

    gameState.language = getLanguage();

    return gameState;
}
export function restoreGameStatus(gameState) {
    return new Promise((resolve, reject) => {
        try {
            // Game variables

            // Flags

            // UI elements

            setLanguage(gameState.language);

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export function setLocalization(value) {
    localization = value;
}

export function getLocalization() {
    return localization;
}

export function setLanguage(value) {
    language = value;
}

export function getLanguage() {
    return language;
}

export function setOldLanguage(value) {
    oldLanguage = value;
}

export function getOldLanguage() {
    return oldLanguage;
}

export function setAudioMuted(value) {
    audioMuted = value;
}

export function getAudioMuted() {
    return audioMuted;
}

export function getMenuState() {
    return MENU_STATE;
}

export function getGameVisiblePaused() {
    return GAME_VISIBLE_PAUSED;
}

export function getGameVisibleActive() {
    return GAME_VISIBLE_ACTIVE;
}

export function getLanguageSelected() {
    return languageSelected;
}

export function setLanguageSelected(value) {
    languageSelected = value;
}

export function getBeginGameStatus() {
    return beginGameState;
}

export function setBeginGameStatus(value) {
    beginGameState = value;
}

export function getGameInProgress() {
    return gameInProgress;
}

export function setGameInProgress(value) {
    gameInProgress = value;
}

export function setCanvasLogScrollOffset(offset) {
  canvasLogScrollOffset = offset;
}

export function getCanvasLogScrollOffset() {
  return canvasLogScrollOffset;
}

export function getTypingQueue() {
    return typingQueue;
  }
  export function setTypingQueue(newQueue) {
    typingQueue = newQueue;
  }
  
  export function getCurrentLine() {
    return currentLine;
  }
  export function setCurrentLine(newLine) {
    currentLine = newLine;
  }

  export function getCurrentCharIndex() {
    return currentCharIndex;
  }
  export function setCurrentCharIndex(newIndex) {
    currentCharIndex = newIndex;
  }

  export function getTypingSpeed() {
    return typingSpeed;
  }
  export function setTypingSpeed(newSpeed) {
    typingSpeed = newSpeed;
  }

  export function getIsTyping() {
    return isTyping;
  }
  export function setIsTyping(newStatus) {
    isTyping = newStatus;
  }
  
  export function getCursorVisible() {
    return cursorVisible;
  }
  export function setCursorVisible(newVisible) {
    cursorVisible = newVisible;
  }
  
  export function getLastCursorToggleTime() {
    return lastCursorToggleTime;
  }
  export function setLastCursorToggleTime(newTime) {
    lastCursorToggleTime = newTime;
  }

  export function getCursorFlashInterval() {
    return cursorFlashInterval;
  }

  export function getCursorWidth() {
    return cursorWidth;
  }

  export function getCursorHeight() {
    return cursorHeight;
  }
  
