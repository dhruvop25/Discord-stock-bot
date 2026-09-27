const express = require("express");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder
} = require("discord.js");

// ==============================
// RENDER WEB SERVER
// ==============================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("OXAAM REWARDS STOCK BOT IS ONLINE!");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// ==============================
// ENVIRONMENT VARIABLES
// ==============================

const TOKEN = process.env.DISCORD_TOKEN;
const STOCK_CHANNEL_ID = process.env.STOCK_CHANNEL_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

if (!STOCK_CHANNEL_ID) {
  console.error("❌ STOCK_CHANNEL_ID is missing!");
  process.exit(1);
}

// ==============================
// DESTINATION CHANNELS
// ==============================

const DESTINATIONS = {
  crunchyroll: "1552953210640146453",
  steam: "1552953751722262578",
  xbox: "1552953812241752154",
  mcfa: "1552953874631888966",
  mcredeem: "1552956695041548348",
  hotmail: "1552956546663850055",
  netflix: "1552956197106098306",
  tools: "1552956644986454116",
  psn: "1552956465000615987",
  vipmcfa: "1552959203595919410",
  viptool: "1552959272919506986"
};

// ==============================
// BRANDING
// ==============================

const BRANDING = `
MADE BY OXAAM REWARDS 💲
FOUNDER - dhruvop263
Discord: https://discord.gg/8uGcS6V4vV
`;

// ==============================
// DISCORD CLIENT
// ==============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==============================
// SLASH COMMANDS
// ==============================

const commands = Object.keys(DESTINATIONS).map((name) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(`Send latest ${name} text stock`)
    .toJSON()
);

// ==============================
// BOT READY
// ==============================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Slash command registration error:");
    console.error(error);
  }
});

// ==============================
// COMMAND HANDLER
// ==============================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const targetChannelId = DESTINATIONS[commandName];

  if (!targetChannelId) {
    return interaction.reply({
      content: "❌ Unknown command.",
      ephemeral: true
    });
  }

  await interaction.deferReply({
    ephemeral: true
  });

  try {

    // ==========================
    // GET STOCK CHANNEL
    // ==========================

    const stockChannel = await client.channels.fetch(
      STOCK_CHANNEL_ID
    );

    if (!stockChannel || !stockChannel.isTextBased()) {
      return interaction.editReply(
        "❌ Stock channel not found."
      );
    }

    // ==========================
    // GET TARGET CHANNEL
    // ==========================

    const targetChannel = await client.channels.fetch(
      targetChannelId
    );

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.editReply(
        "❌ Target channel not found."
      );
    }

    // ==========================
    // GET RECENT MESSAGES
    // ==========================

    const messages = await stockChannel.messages.fetch({
      limit: 50
    });

    // ==========================
    // FIND LATEST TXT FILE
    // ==========================

    const stockMessage = messages.find(
      (message) => {
        if (message.author.bot) return false;

        for (const attachment of message.attachments.values()) {
          const name = attachment.name || "";

          if (name.toLowerCase().endsWith(".txt")) {
            return true;
          }
        }

        return false;
      }
    );

    if (!stockMessage) {
      return interaction.editReply(
        "❌ No .txt stock file found in the stock channel."
      );
    }

    // ==========================
    // PROCESS TXT FILES
    // ==========================

    let processedCount = 0;

    for (const attachment of stockMessage.attachments.values()) {

      const filename = attachment.name || "stock.txt";

      if (!filename.toLowerCase().endsWith(".txt")) {
        continue;
      }

      // ========================
      // DOWNLOAD FILE
      // ========================

      const response = await fetch(attachment.url);

      if (!response.ok) {
        console.error(
          `Failed to download ${filename}`
        );
        continue;
      }

      const fileBuffer = Buffer.from(
        await response.arrayBuffer()
      );

      const originalText = fileBuffer.toString("utf8");

      // ========================
      // REMOVE FIRST 6 LINES
      // ========================

      const lines = originalText.split(/\r?\n/);

      const remainingLines = lines.slice(6);

      const cleanedText = remainingLines.join("\n");

      // ========================
      // ADD BRANDING
      // ========================

      const finalText =
        cleanedText.trimEnd() +
        "\n\n" +
        "----------------------------------------\n" +
        BRANDING.trim() +
        "\n----------------------------------------\n";

      // ========================
      // CREATE NEW FILE
      // ========================

      const outputFile = new AttachmentBuilder(
        Buffer.from(finalText, "utf8"),
        {
          name: filename
        }
      );

      // ========================
      // SEND TO TARGET CHANNEL
      // ========================

      await targetChannel.send({
        content:
          `📦 **${commandName.toUpperCase()} STOCK**\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `MADE BY OXAAM REWARDS 💲`,
        files: [outputFile]
      });

      processedCount++;
    }

    // ==========================
    // RESULT
    // ==========================

    if (processedCount === 0) {
      return interaction.editReply(
        "❌ No valid .txt file could be processed."
      );
    }

    await interaction.editReply(
      `✅ Successfully processed ${processedCount} file(s) and sent them to <#${targetChannelId}>.`
    );

  } catch (error) {

    console.error("❌ ERROR:");
    console.error(error);

    await interaction.editReply(
      "❌ Something went wrong while processing the stock file."
    );
  }
});

// ==============================
// LOGIN
// ==============================

client.login(TOKEN);
