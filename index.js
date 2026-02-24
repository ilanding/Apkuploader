require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

async function getOrCreateRelease() {
  const repo = process.env.REPO;
  const token = process.env.GITHUB_TOKEN;

  // Check if release exists
  const check = await fetch(`https://api.github.com/repos/${repo}/releases/tags/latest`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (check.status === 200) {
    return await check.json();
  }

  // Create release if not exists
  const create = await fetch(`https://api.github.com/repos/${repo}/releases`, {
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

  return await create.json();
}

bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  try {
    bot.sendMessage(chatId, "📥 Downloading file...");

    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    bot.sendMessage(chatId, "🚀 Uploading to GitHub...");

    const release = await getOrCreateRelease();
    const uploadUrl = release.upload_url.replace("{?name,label}", "");

    // Unique filename every time
    const uniqueName = `app-${Date.now()}.apk`;

    const upload = await fetch(`${uploadUrl}?name=${uniqueName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: buffer
    });

    if (!upload.ok) {
      const errText = await upload.text();
      throw new Error(errText);
    }

    bot.sendMessage(chatId, "✅ APK uploaded successfully to GitHub Release!");
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Upload failed: " + err.message);
  }
});
