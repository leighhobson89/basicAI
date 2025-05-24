import express from "express";
import { spawn } from "child_process";
import cors from "cors";

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

  // Optional: kill process after timeout (if it hangs)
  setTimeout(() => {
    proc.kill();
  }, 10000);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Gemma3 API listening at http://localhost:${port}`);
});
