require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;
  const fileName = "app.apk";

  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = await response.buffer();
    const content = buffer.toString("base64");

    let sha;
    const check = await fetch(`https://api.github.com/repos/${process.env.REPO}/contents/${fileName}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    });

    if (check.status === 200) {
      const data = await check.json();
      sha = data.sha;
    }

    await fetch(`https://api.github.com/repos/${process.env.REPO}/contents/${fileName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "APK Updated via Telegram",
        content: content,
        sha: sha
      })
    });

    bot.sendMessage(chatId, "APK uploaded successfully!");
  } catch (err) {
    bot.sendMessage(chatId, "Error: " + err.message);
  }
});
