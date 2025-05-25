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

async function queryOllamaModel(modelName, prompt) {
  const response = await fetch(`${OLLAMA_API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

// Create a mini express server to proxy queries to a model's ollama run instance on given port
function createModelServer(modelName, port) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post(`/api/${modelName}`, async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    try {
      const output = await queryOllamaModel(modelName, prompt);
      res.json({ response: output.trim() });
    } catch (err) {
      console.error(`Ollama API call failed for ${modelName}:`, err.message);
      res.status(500).json({ error: "Failed to get response from model" });
    }
  });

  app.listen(port, () => {
    console.log(`${modelName} API listening at http://127.0.0.1:${port}`);
  });
}

// Start the model servers with appropriate models and ports
createModelServer("gemma3", 3500);
createModelServer("qwen3", 3501);

const mainApp = express();
mainApp.use(cors());
mainApp.use(express.json());

async function queryModelServer(port, modelName, prompt) {
  const response = await fetch(`http://127.0.0.1:${port}/api/${modelName}`, {
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

// Main router endpoint: accepts JSON { model: "gemma3"|"qwen3", prompt: string }
mainApp.post("/api/generate", async (req, res) => {
  try {
    const { model, prompt: userPrompt } = req.body;

    if (!model || !userPrompt) {
      return res.status(400).json({ error: "Missing model or prompt" });
    }

    if (!["gemma3", "qwen3"].includes(model)) {
      return res.status(400).json({ error: `Unknown model "${model}"` });
    }

    // Shutdown logic if user requests it (optional)
    if (userPrompt.toLowerCase().includes("shutdown")) {
      res.json({ message: "Server is shutting down..." });
      console.log("Shutdown command received. Closing servers...");
      setTimeout(() => {
        process.exit(0);
      }, 1000);
      return;
    }

    // Support chatBot looping logic (optional)
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
        // Alternate between gemma3 and qwen3
        const currentModel = i % 2 === 0 ? "gemma3" : "qwen3";
        const currentPort = currentModel === "gemma3" ? 3500 : 3501;

        console.log(
          `[ChatBot Loop] Sending to ${currentModel} (${currentPort}): ${message}`
        );

        message = await queryModelServer(
          currentPort,
          currentModel,
          `AI: ${message}\nAI:`
        );
        console.log(
          `[ChatBot Loop] Response from ${currentModel} (${currentPort}): ${message}`
        );

        await appendToContextFile(`AI: ${message}`);
        exchangeLog.push({ model: currentModel, port: currentPort, message });
      }

      return res.json({ finalResponse: message, exchangeLog });
    }

    // Support 2AI flag to query both models
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

    // Query first model
    const firstPrompt = contextFileContent + `\nUser: ${cleanPrompt}\nAI:`;
    console.log(
      `[MainAPI] Prompt sent to model ${model} (${
        model === "gemma3" ? 3500 : 3501
      }):\n`,
      firstPrompt
    );

    const firstPort = model === "gemma3" ? 3500 : 3501;
    const response1 = await queryModelServer(firstPort, model, firstPrompt);
    console.log(
      `[MainAPI] Response from ${model} (${firstPort}): ${response1}`
    );

    await appendToContextFile(`User: ${cleanPrompt}\nAI: ${response1}`);

    if (isTwoAI) {
      const otherModel = model === "gemma3" ? "qwen3" : "gemma3";
      const otherPort = otherModel === "gemma3" ? 3500 : 3501;

      const secondPrompt = `AI: ${response1}\nAI:`;
      console.log(
        `[MainAPI] Prompt sent to model ${otherModel} (${otherPort}):\n`,
        secondPrompt
      );

      let response2 = await queryModelServer(
        otherPort,
        otherModel,
        secondPrompt
      );
      console.log(
        `[MainAPI] Response from ${otherModel} (${otherPort}): ${response2}`
      );

      if (otherModel === "qwen3") {
        response2 = cleanQwen3Response(response2);
      }

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
  // Ensure both models are running before starting main API
  await ensureModelIsRunning("gemma3");
  await ensureModelIsRunning("qwen3");

  mainApp.listen(mainPort, () => {
    console.log(`Main API router listening at http://127.0.0.1:${mainPort}`);
  });
})();

function cleanQwen3Response(text) {
  const thinkTagRegex = /<think>[\s\S]*?<\/think>/gi;

  const matches = [...text.matchAll(thinkTagRegex)];

  if (matches.length === 0) {
    return text;
  }

  const lastThink = matches[matches.length - 1];
  const lastThinkEndIndex = lastThink.index + lastThink[0].length;

  return text.slice(lastThinkEndIndex).trim();
}