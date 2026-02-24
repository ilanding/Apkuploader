require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

async function getOrCreateRelease() {
  const repo = process.env.REPO;
  const token = process.env.GITHUB_TOKEN;

  const releaseCheck = await fetch(`https://api.github.com/repos/${repo}/releases/tags/latest`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (releaseCheck.status === 200) {
    const data = await releaseCheck.json();
    return data;
  }

  const createRelease = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tag_name: "latest",
      name: "Latest APK",
      body: "Auto uploaded APK",
      draft: false,
      prerelease: false
    })
  });

  return await createRelease.json();
}

bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    const release = await getOrCreateRelease();
    const uploadUrl = release.upload_url.replace("{?name,label}", "");

    await fetch(`${uploadUrl}?name=app.apk`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: buffer
    });

    bot.sendMessage(chatId, "✅ APK uploaded to GitHub Release successfully!");
  } catch (err) {
    bot.sendMessage(chatId, "❌ Error: " + err.message);
  }
});
