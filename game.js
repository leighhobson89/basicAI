import { localize } from './localization.js';
import {
  getCanvasLogScrollOffset,
  canvasLogBuffer,
  setGameStateVariable,
  getBeginGameStatus,
  getMenuState,
  getGameVisiblePaused,
  getGameVisibleActive,
  getElements,
  getLanguage,
  getGameInProgress,
  gameState,
  getTypingQueue,
  setTypingQueue,
  getCurrentLine,
  setCurrentLine,
  getCurrentCharIndex,
  setCurrentCharIndex,
  getTypingSpeed,
  getIsTyping,
  setIsTyping,
  getCursorVisible,
  setCursorVisible,
  getLastCursorToggleTime,
  setLastCursorToggleTime,
  getCursorFlashInterval,
  getCursorWidth,
  getCursorHeight,
} from "./constantsAndGlobalVars.js";
import { outputToCanvas, renderHTMLString } from "./ui.js";

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    const ctx = getElements().canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const canvasWidth = container.clientWidth * 0.8;
        const canvasHeight = container.clientHeight * 0.8;

        getElements().canvas.style.width = `${canvasWidth}px`;
        getElements().canvas.style.height = `${canvasHeight}px`;

        getElements().canvas.width = canvasWidth;
        getElements().canvas.height = canvasHeight;
        
        ctx.scale(1, 1);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    typeLines([
      "Welcome to the canvas terminal!",
      "System <b>ready</b> for <i>deployment</i>.",
      'Error: <span style="color: red">Connection failed</span>',
      'Info: <span style="color: yellow">Running diagnostics...</span>',
    ]);
    
    gameLoop();
}

export function gameLoop(timestamp) {
  const ctx = getElements().canvas.getContext("2d");
  if (
    gameState === getGameVisibleActive() ||
    gameState === getGameVisiblePaused()
  ) {
    ctx.clearRect(
      0,
      0,
      getElements().canvas.width,
      getElements().canvas.height
    );
    drawCanvasLog(ctx, timestamp);
    requestAnimationFrame(gameLoop);
  }
}

function drawCanvasLog(ctx, now) {
  const lineHeight = 18;
  const x = 10;
  const yStart = 30;
  const scrollOffset = getCanvasLogScrollOffset();
  const visibleLines = Math.floor(ctx.canvas.height / lineHeight);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#0f0";

  const startLine = Math.max(
    0,
    canvasLogBuffer.length - visibleLines - scrollOffset
  );
  const endLine = Math.min(canvasLogBuffer.length, startLine + visibleLines);

  for (let i = startLine, j = 0; i < endLine; i++, j++) {
    const y = yStart + j * lineHeight;
    renderHTMLString(ctx, x, y, canvasLogBuffer[i]);
  }

  // Cursor handling
  if (canvasLogBuffer.length > 0) {
    if (!getIsTyping()) {
      if (!getLastCursorToggleTime()) setLastCursorToggleTime(now);
      if (now - getLastCursorToggleTime() > getCursorFlashInterval()) {
        setCursorVisible(!getCursorVisible());
        setLastCursorToggleTime(now);
      }
    } else {
      setCursorVisible(true);
    }

    if (getCursorVisible()) {
      const lastLineIndex = endLine - 1;
      if (lastLineIndex >= 0 && lastLineIndex < canvasLogBuffer.length) {
        const lastLine = canvasLogBuffer[lastLineIndex];
        const y = yStart + (lastLineIndex - startLine) * lineHeight;
        const widthBeforeCursor = ctx.measureText(stripHtml(lastLine)).width;

        ctx.fillStyle = "#0f0";
        ctx.fillRect(
          x + widthBeforeCursor,
          y - getCursorHeight() + 4,
          getCursorWidth(),
          getCursorHeight()
        );
      }
    }
  }
}
  

// Helper function to strip HTML tags for measuring text width correctly
function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
} 

export function typeLines(lines) {
  const queue = getTypingQueue();
  queue.push(...lines);
  setTypingQueue(queue);

  if (!getIsTyping()) {
    setIsTyping(true);
    typeNextLine();
  }
}

function typeNextLine() {
  const queue = getTypingQueue();

  if (queue.length === 0) {
    setIsTyping(false);
    return;
  }

  setCurrentLine(queue.shift());
  setCurrentCharIndex(0);

  canvasLogBuffer.push("");

  typeCharacter();
}  

function typeCharacter() {
  const charIndex = getCurrentCharIndex();
  const line = getCurrentLine();

  if (charIndex <= line.length) {
    canvasLogBuffer[canvasLogBuffer.length - 1] = line.substring(0, charIndex);

    setCurrentCharIndex(charIndex + 1);

    setTimeout(typeCharacter, getTypingSpeed());
  } else {
    typeNextLine();
  }
}
  

export function setGameState(newState) {
    console.log("Setting game state to " + newState);
    setGameStateVariable(newState);

    switch (newState) {
        case getMenuState():
            getElements().menu.classList.remove('d-none');
            getElements().menu.classList.add('d-flex');
            getElements().buttonRow.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-flex');
            getElements().canvasContainer.classList.remove('d-flex');
            getElements().canvasContainer.classList.add('d-none');
            getElements().returnToMenuButton.classList.remove('d-flex');
            getElements().returnToMenuButton.classList.add('d-none');
            getElements().pauseResumeGameButton.classList.remove('d-flex');
            getElements().pauseResumeGameButton.classList.add('d-none');
            
            const languageButtons = [getElements().btnEnglish, getElements().btnSpanish, getElements().btnGerman, getElements().btnItalian, getElements().btnFrench];
            languageButtons.forEach(button => {
                button.classList.remove('active');
            });

            const currentLanguage = getLanguage();
            console.log("Language is " + getLanguage());
            switch (currentLanguage) {
                case 'en':
                    console.log("Setting Active state on English");
                    getElements().btnEnglish.classList.add('active');
                    break;
                case 'es':
                    console.log("Setting Active state on Spanish");
                    getElements().btnSpanish.classList.add('active');
                    break;
                case 'de':
                    console.log("Setting Active state on German");
                    getElements().btnGerman.classList.add('active');
                    break;
                case 'it':
                    console.log("Setting Active state on Italian");
                    getElements().btnItalian.classList.add('active');
                    break;
                case 'fr':
                    console.log("Setting Active state on French");
                    getElements().btnFrench.classList.add('active');
                    break;
            }

            if (getGameInProgress()) {
                getElements().copyButtonSavePopup.innerHTML = `${localize('copyButton', getLanguage())}`;
                getElements().closeButtonSavePopup.innerHTML = `${localize('closeButton', getLanguage())}`;
            }
            break;
        case getGameVisiblePaused():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.classList.remove('d-none');
            getElements().pauseResumeGameButton.classList.add('d-flex');
            if (getBeginGameStatus()) {
                getElements().pauseResumeGameButton.innerHTML = `${localize('begin', getLanguage())}`;
            } else {
                getElements().pauseResumeGameButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
            }
            
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            break;
        case getGameVisibleActive():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.classList.remove('d-none');
            getElements().pauseResumeGameButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.innerHTML = `${localize('pause', getLanguage())}`;
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            break;
    }
}
