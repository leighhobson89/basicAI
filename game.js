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

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    const ctx = getElements().canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
      const containerWidth = container.clientWidth;
      const canvasWidth = containerWidth * 0.8;
      const canvasHeight = container.clientHeight * 0.7;

      const canvas = getElements().canvas;
      const input = getElements().inputContainer;

      // Resize canvas
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      input.style.width = `${canvasWidth}px`;
      input.style.marginTop = "5px";
      input.style.display = "block";

      ctx.scale(1, 1);
    }
      

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    typeLines([
      "Welcome to LeighPT!",
      "What can I do for you?",
      'If you want me to ask my friend, just write "2ai" after your prompt',
      'If you want us to chat to each other about a topic, do "chatBot <# of exchanges> <prompt>',
      ">",
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
  const bottomMargin = 30;
  const x = 10;
  const usableHeight = ctx.canvas.height - bottomMargin;
  const yStart = 30;
  const visibleLines = Math.floor(usableHeight / lineHeight);
  const scrollOffset = getCanvasLogScrollOffset();

  ctx.font = "16px monospace";

  const startLine = Math.max(
    0,
    canvasLogBuffer.length - visibleLines - scrollOffset
  );
  const endLine = Math.min(canvasLogBuffer.length, startLine + visibleLines);

  for (let i = startLine, j = 0; i < endLine; i++, j++) {
    const y = yStart + j * lineHeight;

    const lineObj = canvasLogBuffer[i];
    if (!lineObj) continue;

    ctx.fillStyle = lineObj.color || "#00ff00";
    ctx.fillText(lineObj.text, x, y);
  }

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
        const widthBeforeCursor = ctx.measureText(lastLine.text).width;

        ctx.fillStyle = lastLine.color || "#0f0";
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


export function typeLines(input) {
  const queue = getTypingQueue();
  const ctx = getElements().canvas.getContext("2d");
  ctx.font = "16px monospace";
  const maxWidth = getElements().canvas.width - 20;

  function pushLinesWithColor(text, color) {
    const wrappedLines = wrapText(ctx, text, maxWidth);
    wrappedLines.forEach((line) => queue.push({ text: line, color }));
  }

  if (Array.isArray(input)) {
    // Array of strings (each line plain)
    input.forEach((line) => pushLinesWithColor(line, "#00FF00"));
  } else if (typeof input === "object" && input !== null) {
    if ("response1" in input && "response2" in input) {
      // Two-response scenario (e.g., 2ai)
      pushLinesWithColor(input.response1, "#FFFF00");
      queue.push({ text: "", color: "#FFFF00" });
      pushLinesWithColor(input.response2, "#00FFFF");
    } else if ("response" in input) {
      // Single-response scenario
      pushLinesWithColor(input.response, "#FFFF00");
    } else if ("exchangeLog" in input && Array.isArray(input.exchangeLog)) {
      // chatBot loop scenario
      const colors = ["#FFFF00", "#00FFFF"]; // yellow, cyan
      input.exchangeLog.forEach((entry, index) => {
        const color = colors[index % 2];
        pushLinesWithColor(entry.message, color);
        queue.push({ text: "", color }); // line spacing
      });
    } else {
      console.warn("Unexpected object shape:", input);
    }
  } else {
    console.warn("Unsupported input format:", input);
  }

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

  // Now each line is an object { text, color }
  setCurrentLine(queue.shift());
  setCurrentCharIndex(0);

  canvasLogBuffer.push({ text: "", color: getCurrentLine().color });

  typeCharacter();
}

function typeCharacter() {
  const charIndex = getCurrentCharIndex();
  const lineObj = getCurrentLine(); // { text, color }
  const lineText = lineObj.text;

  if (charIndex <= lineText.length) {
    // Update last line in buffer with partial text and color
    canvasLogBuffer[canvasLogBuffer.length - 1] = {
      text: lineText.substring(0, charIndex),
      color: lineObj.color,
    };

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
            getElements().canvasContainer.classList.remove('d-flex');
            getElements().canvasContainer.classList.add('d-none');
            
            const languageButtons = [getElements().btnEn, getElements().btnEs, getElements().btnDe, getElements().btnIt, getElements().btnFr];
            languageButtons.forEach(button => {
                button.classList.remove('active');
            });

            const currentLanguage = getLanguage();
            console.log("Language is " + getLanguage());
            switch (currentLanguage) {
                case 'en':
                    console.log("Setting Active state on English");
                    getElements().btnEn.classList.add('active');
                    break;
                case 'es':
                    console.log("Setting Active state on Spanish");
                    getElements().btnEs.classList.add('active');
                    break;
                case 'de':
                    console.log("Setting Active state on German");
                    getElements().btnDe.classList.add('active');
                    break;
                case 'it':
                    console.log("Setting Active state on Italian");
                    getElements().btnIt.classList.add('active');
                    break;
                case 'fr':
                    console.log("Setting Active state on French");
                    getElements().btnFr.classList.add('active');
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
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            break;
        case getGameVisibleActive():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            break;
    }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  let lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && line !== "") {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}


