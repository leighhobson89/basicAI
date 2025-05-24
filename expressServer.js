import express from "express";
import { spawn } from "child_process";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";

const contextFilePath = path.resolve("./context.txt");

async function appendToContextFile(entryText) {
  try {
    await fs.appendFile(contextFilePath, entryText + "\n", "utf-8");
    console.log("Appended to context.txt:\n", entryText);
  } catch (err) {
    console.error("Failed to append to context.txt:", err);
  }
}

function createGemma3Server(port) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/api/gemma3", (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const proc = spawn("ollama", ["run", "gemma3"]);
    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", (err) => {
      res
        .status(500)
        .json({ error: "Ollama process error", details: err.message });
    });

    proc.on("close", () => {
      res.json({ response: output.trim() });
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    setTimeout(() => {
      proc.kill();
    }, 10000);
  });

  app.listen(port, () => {
    console.log(`Gemma3 API listening at http://localhost:${port}`);
  });
}

createGemma3Server(3500);
createGemma3Server(4500);

const mainApp = express();
mainApp.use(cors());
mainApp.use(express.json());

async function queryServer(port, prompt) {
  const response = await fetch(`http://localhost:${port}/api/gemma3`, {
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

    if (userPrompt.startsWith("chatBot")) {
      const parts = userPrompt.split(" ");
      if (parts.length < 3 || isNaN(parseInt(parts[1]))) {
        return res
          .status(400)
          .json({
            error: "Invalid chatBot syntax. Use: chatBot <count> <prompt>",
          });
      }

      const loopCount = parseInt(parts[1]);
      let message = parts.slice(2).join(" ");
      const exchangeLog = [];

      for (let i = 0; i < loopCount; i++) {
        const port = i % 2 === 0 ? 3500 : 4500;
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
      console.log("[MainAPI] Prompt sent to model (4500):\n", prompt2);

      const response2 = await queryServer(4500, prompt2);
      console.log(`[MainAPI] Response from 4500: ${response2}`);

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
mainApp.listen(mainPort, () => {
  console.log(`Main API router listening at http://localhost:${mainPort}`);
});
