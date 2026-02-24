require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    const repo = process.env.REPO;
    const token = process.env.GITHUB_TOKEN;

    const fileName = `apk-${Date.now()}.apk`;

    const upload = await fetch(`https://api.github.com/repos/${repo}/contents/${fileName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Upload APK via Telegram bot",
        content: buffer.toString("base64")
      })
    });

    if (upload.ok) {
      bot.sendMessage(chatId, "✅ APK uploaded to GitHub successfully!");
    } else {
      const error = await upload.text();
      bot.sendMessage(chatId, "❌ GitHub upload failed:\n" + error);
    }

  } catch (err) {
    bot.sendMessage(chatId, "❌ Error:\n" + err.message);
  }
});
