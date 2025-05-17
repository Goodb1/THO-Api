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
  // Expect both "roblox_username" and "discord_username"
  const { roblox_username, discord_username, reason, duration, expiresAt, bannedBy } = req.body;
  if (!roblox_username && !discord_username) {
    return res.status(400).json({ error: "Fornisci almeno 'roblox_username' o 'discord_username'." });
  }
  const exists = blacklist.find(entry =>
    (roblox_username && entry.roblox_username === roblox_username) ||
    (discord_username && entry.discord_username === discord_username)
  );
  if (exists) {
    return res.status(400).json({ error: "User is already blacklisted." });
  }
  const newEntry = {
    roblox_username: roblox_username || null,
    discord_username: discord_username || null,
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
  const { roblox_username, discord_username } = req.body;
  if (!roblox_username && !discord_username) {
    return res.status(400).json({ error: "Fornisci almeno 'roblox_username' o 'discord_username'." });
  }
  const initialLength = blacklist.length;
  blacklist = blacklist.filter(entry => {
    return !((roblox_username && entry.roblox_username === roblox_username) ||
             (discord_username && entry.discord_username === discord_username));
  });
  if (blacklist.length === initialLength) {
    return res.status(404).json({ error: "Utente non trovato nella blacklist." });
  }
  writeBlacklist(blacklist);
  return res.json({ message: "User removed from blacklist." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
