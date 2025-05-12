const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const FILE_PATH = path.join(__dirname, 'blacklist.json');

app.get("/", (req, res) => {
  res.send("Welcome to the Roblox Blacklist API!");
});

function readBlacklist() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading blacklist:", error);
  }
  return [];
}

function writeBlacklist(data) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Error writing blacklist:", error);
  }
}

let blacklist = readBlacklist();

function filterExpiredBans() {
  const now = new Date();
  const newList = blacklist.filter(entry => {

    if (entry.expiresAt) {
      const expiry = new Date(entry.expiresAt);
      return expiry > now;
    }
    return true;
  });
  if (newList.length !== blacklist.length) {
    blacklist = newList;
    writeBlacklist(blacklist);
  }
}

app.get('/blacklist', (req, res) => {
  filterExpiredBans();
  res.json(blacklist);
});

app.post('/blacklist', (req, res) => {
  const { username, userId, reason, duration, expiresAt, bannedBy } = req.body;
  if (!username && !userId) {
    return res.status(400).json({ error: "Fornisci almeno 'username' o 'userId'." });
  }
  const exists = blacklist.find(entry => (username && entry.username === username) || (userId && entry.userId == userId));
  if (exists) {
    return res.status(400).json({ error: "User is already blacklisted." });
  }
  const newEntry = {
    username: username || null,
    userId: userId || null,
    reason: reason || "",
    duration: duration || "permanent",
    expiresAt: expiresAt || null,
    bannedBy: bannedBy || "",
    addedAt: new Date().toISOString()
  };
  blacklist.push(newEntry);
  writeBlacklist(blacklist);
  res.json({ message: "User added to blacklist", entry: newEntry });
});

app.delete('/blacklist', (req, res) => {
  const { username, userId } = req.body;
  if (!username && !userId) {
    return res.status(400).json({ error: "Fornisci almeno 'username' o 'userId'." });
  }
  const initialLength = blacklist.length;
  blacklist = blacklist.filter(entry => !((username && entry.username === username) || (userId && entry.userId == userId)));
  if (blacklist.length === initialLength) {
    return res.status(404).json({ error: "Utente non trovato nella blacklist." });
  }
  writeBlacklist(blacklist);
  return res.json({ message: "User removed from blacklist." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
