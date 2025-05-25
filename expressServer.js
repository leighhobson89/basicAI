import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import { spawn } from "child_process";

const contextFilePath = path.resolve("./context.txt");

async function appendToContextFile(entryText) {
  try {
    await fs.appendFile(contextFilePath, entryText + "\n", "utf-8");
    console.log("Appended to context.txt:\n", entryText);
  } catch (err) {
    console.error("Failed to append to context.txt:", err);
  }
}

// Ollama API base URL with IPv4 explicit
const OLLAMA_API_BASE = "http://127.0.0.1:11434";

async function isModelRunning(modelName) {
  try {
    const res = await fetch(`${OLLAMA_API_BASE}/api/list`);
    if (!res.ok) {
      throw new Error(`Ollama list API error: ${res.statusText}`);
    }
    const data = await res.json();
    // data is an array of running models or containers, check if modelName exists
    return data.some((item) => item.name === modelName);
  } catch (err) {
    console.error("Failed to check running models:", err.message);
    return false;
  }
}

function startOllamaRunModel(modelName) {
  console.log(`Starting Ollama model with: ollama run ${modelName}`);
  const proc = spawn("ollama", ["run", modelName], {
    stdio: "inherit",
  });

  proc.on("error", (err) => {
    console.error(`Failed to start ollama run:`, err.message);
  });

  proc.on("exit", (code, signal) => {
    console.log(
      `Ollama run process exited with code ${code}, signal ${signal}`
    );
  });

  return proc;
}

async function ensureModelIsRunning(modelName) {
  const running = await isModelRunning(modelName);
  if (!running) {
    return startOllamaRunModel(modelName);
  }
  console.log(`Model "${modelName}" is already running.`);
  return null;
}

async function queryOllama(prompt) {
  const response = await fetch(`${OLLAMA_API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma3",
      prompt: prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

function createGemma3Server(port) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/api/gemma3", async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    try {
      const output = await queryOllama(prompt);
      res.json({ response: output.trim() });
    } catch (err) {
      console.error("Ollama API call failed:", err.message);
      res.status(500).json({ error: "Failed to get response from model" });
    }
  });

  app.listen(port, () => {
    console.log(`Gemma3 API listening at http://127.0.0.1:${port}`);
  });
}

createGemma3Server(3500);
createGemma3Server(3501);

const mainApp = express();
mainApp.use(cors());
mainApp.use(express.json());

async function queryServer(port, prompt) {
  const response = await fetch(`http://127.0.0.1:${port}/api/gemma3`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Server ${port} error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

mainApp.post("/api/gemma3", async (req, res) => {
  try {
    let userPrompt = req.body.prompt;
    if (!userPrompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Shutdown logic
    if (userPrompt.toLowerCase().includes("shutdown")) {
      res.json({ message: "Server is shutting down..." });
      console.log("Shutdown command received. Closing servers...");

      // Wait a moment so response is sent, then exit
      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return;
    }

    if (userPrompt.startsWith("chatBot")) {
      const parts = userPrompt.split(" ");
      if (parts.length < 3 || isNaN(parseInt(parts[1]))) {
        return res.status(400).json({
          error: "Invalid chatBot syntax. Use: chatBot <count> <prompt>",
        });
      }

      const loopCount = parseInt(parts[1]);
      let message = parts.slice(2).join(" ");
      const exchangeLog = [];

      for (let i = 0; i < loopCount; i++) {
        const port = i % 2 === 0 ? 3500 : 3501;
        console.log(`[ChatBot Loop] Sending to ${port}: ${message}`);

        message = await queryServer(port, `AI: ${message}\nAI:`);
        console.log(`[ChatBot Loop] Response from ${port}: ${message}`);

        await appendToContextFile(`AI: ${message}`);
        exchangeLog.push({ port, message });
      }

      return res.json({ finalResponse: message, exchangeLog });
    }

    const isTwoAI = userPrompt.includes("2ai");
    const cleanPrompt = userPrompt.replace("2ai", "").trim();

    let contextFileContent = "";
    try {
      contextFileContent = await fs.readFile(contextFilePath, "utf-8");
    } catch (err) {
      console.warn(
        "Could not read context.txt, continuing with empty context."
      );
    }

    const prompt1 = contextFileContent + `\nUser: ${cleanPrompt}\nAI:`;
    console.log("[MainAPI] Full prompt sent to model (3500):\n", prompt1);

    const response1 = await queryServer(3500, prompt1);
    console.log(`[MainAPI] Response from 3500: ${response1}`);

    await appendToContextFile(`User: ${cleanPrompt}\nAI: ${response1}`);

    if (isTwoAI) {
      const prompt2 = `AI: ${response1}\nAI:`;
      console.log("[MainAPI] Prompt sent to model (3501):\n", prompt2);

      const response2 = await queryServer(3501, prompt2);
      console.log(`[MainAPI] Response from 3501: ${response2}`);

      await appendToContextFile(`AI: ${response2}`);

      return res.json({ response1, response2 });
    } else {
      return res.json({ response: response1 });
    }
  } catch (error) {
    console.error("[MainAPI] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const mainPort = 2500;

(async () => {
  // Ensure gemma3 model is running before starting servers
  await ensureModelIsRunning("gemma3");

  mainApp.listen(mainPort, () => {
    console.log(`Main API router listening at http://127.0.0.1:${mainPort}`);
  });
})();
