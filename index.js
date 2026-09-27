const {
  Client,
  GatewayIntentBits,
  AttachmentBuilder
} = require("discord.js");

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord Stock Bot is online!");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// ===============================
// CONFIG
// ===============================

const STOCK_CHANNEL_ID = process.env.STOCK_CHANNEL_ID;
const OUTPUT_CHANNEL_ID = process.env.OUTPUT_CHANNEL_ID;

const BRANDING = `\n\n━━━━━━━━━━━━━━━━━━━━\n
⭐ XYZ Rewards
🔗 Discord: https://discord.gg/YOUR-LINK
━━━━━━━━━━━━━━━━━━━━\n`;

// ===============================
// DISCORD CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===============================
// FILE PROCESSING
// ===============================

client.on("messageCreate", async (message) => {
  try {
    // Ignore bots
    if (message.author.bot) return;

    // Only process the selected stock channel
    if (message.channel.id !== STOCK_CHANNEL_ID) return;

    // Check attachments
    if (!message.attachments.size) return;

    const attachment = message.attachments.first();

    // Only TXT files
    if (!attachment.name.toLowerCase().endsWith(".txt")) {
      return;
    }

    console.log(`Processing: ${attachment.name}`);

    // Download file
    const response = await fetch(attachment.url);

    if (!response.ok) {
      console.log("Could not download the file.");
      return;
    }

    const fileText = await response.text();

    // Split into lines
    let lines = fileText.split(/\r?\n/);

    // Remove first 6 lines
    lines = lines.slice(6);

    // Add branding
    const finalText = BRANDING + "\n" + lines.join("\n");

    // Create new file
    const outputFile = Buffer.from(finalText, "utf8");

    const outputName = `processed-${attachment.name}`;

    const outputChannel =
      await client.channels.fetch(OUTPUT_CHANNEL_ID);

    if (!outputChannel) {
      console.log("Output channel not found.");
      return;
    }

    // Send processed file
    const file = new AttachmentBuilder(outputFile, {
      name: outputName
    });

    await outputChannel.send({
      content: "📦 **Stock Updated**",
      files: [file]
    });

    console.log(`Sent processed file: ${outputName}`);

  } catch (error) {
    console.error("Processing error:", error);
  }
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.DISCORD_TOKEN);
