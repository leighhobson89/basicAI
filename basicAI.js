import express from "express";
import path from "path";

const app = express();
const port = 5500;

// Serve static files from the "public" directory (you can adjust this)
app.use(express.static(path.resolve("./")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.resolve("./index.html"));
});

app.listen(port, () => {
  console.log(`Frontend server running at http://localhost:${port}`);
});
