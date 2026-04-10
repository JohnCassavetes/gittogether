import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const CSV_FILE = './leaderboard.csv';

// Initialize CSV with headers if it doesn't exist
if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, 'name,score\nAAA,100\nNJA,50\nBOB,20\n');
}

function getTopScoresFromCSV() {
  const fileData = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = fileData.trim().split('\n');
  
  const scores = [];
  // Skip header, parse the rest
  for (let i = 1; i < lines.length; i++) {
    const [name, scoreStr] = lines[i].split(',');
    if (name && scoreStr) {
      scores.push({ name, score: parseInt(scoreStr, 10) });
    }
  }
  
  // Sort descending and grab top 5
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 5);
}

app.get('/api/scores', (req, res) => {
  try {
    const top5 = getTopScoresFromCSV();
    res.json({ message: "success", data: top5 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  
  try {
    // Append to CSV, ensuring newline spacing
    let currentData = "";
    if (fs.existsSync(CSV_FILE)) {
      currentData = fs.readFileSync(CSV_FILE, 'utf-8');
    }
    const prefix = currentData && !currentData.endsWith('\n') ? '\n' : '';
    
    fs.appendFileSync(CSV_FILE, `${prefix}${name.toUpperCase().substring(0,3)},${score}\n`);
    const top5 = getTopScoresFromCSV();
    res.json({ message: "success", data: top5 });
  } catch (err) {
      res.status(400).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (CSV Backend)`);
});
