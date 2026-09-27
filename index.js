const express = require("express");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder,
  PermissionFlagsBits
} = require("discord.js");

// ==========================================
// RENDER WEB SERVER
// ==========================================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("OXAAM REWARDS STOCK BOT IS ONLINE!");
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

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

// ==========================================
// DESTINATION CHANNELS
// ==========================================

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

// ==========================================
// BRANDING
// ==========================================

const BRANDING = [
  "MADE BY OXAAM REWARDS 💲",
  "FOUNDER - dhruvop263",
  "Discord: https://discord.gg/8uGcS6V4vV"
].join("\n");

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================================
// STOCK SLASH COMMANDS
// ==========================================

const stockCommands = Object.keys(DESTINATIONS).map((name) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(`Send latest ${name} text stock`)
    .toJSON()
);

// ==========================================
// /MSG COMMAND
// ==========================================

const msgCommand = new SlashCommandBuilder()
  .setName("msg")
  .setDescription("Send a custom message through the bot")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("Message you want the bot to send")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages.toString()
  )
  .toJSON();

const commands = [
  ...stockCommands,
  msgCommand
];

// ==========================================
// SAFE HEARTBEAT
// ==========================================

const startTime = Date.now();

setInterval(() => {
  const uptimeSeconds = Math.floor(
    (Date.now() - startTime) / 1000
  );

  const hours = Math.floor(uptimeSeconds / 3600);

  const minutes = Math.floor(
    (uptimeSeconds % 3600) / 60
  );

  const seconds = uptimeSeconds % 60;

  console.log(
    `💓 Heartbeat | Bot running | Uptime: ${hours}h ${minutes}m ${seconds}s`
  );
}, 5 * 60 * 1000);

// ==========================================
// BOT READY
// ==========================================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log(
      "✅ Slash commands registered successfully!"
    );

  } catch (error) {
    console.error(
      "❌ Slash command registration error:"
    );

    console.error(error);
  }
});

// ==========================================
// INTERACTION HANDLER
// ==========================================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) {
    return;
  }

  // ========================================
  // /MSG
  // ========================================

  if (interaction.commandName === "msg") {

    const message =
      interaction.options.getString("message");

    if (!message) {
      return interaction.reply({
        content: "❌ Please enter a message.",
        ephemeral: true
      });
    }

    try {

      await interaction.channel.send({
        content: message
      });

      await interaction.reply({
        content: "✅ Message sent successfully!",
        ephemeral: true
      });

    } catch (error) {

      console.error("❌ /msg error:");
      console.error(error);

      await interaction.reply({
        content: "❌ I couldn't send the message.",
        ephemeral: true
      });
    }

    return;
  }

  // ========================================
  // STOCK COMMAND
  // ========================================

  const commandName =
    interaction.commandName;

  const targetChannelId =
    DESTINATIONS[commandName];

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

    // ======================================
    // STOCK CHANNEL
    // ======================================

    const stockChannel =
      await client.channels.fetch(
        STOCK_CHANNEL_ID
      );

    if (
      !stockChannel ||
      !stockChannel.isTextBased()
    ) {
      return interaction.editReply(
        "❌ Stock channel not found."
      );
    }

    // ======================================
    // TARGET CHANNEL
    // ======================================

    const targetChannel =
      await client.channels.fetch(
        targetChannelId
      );

    if (
      !targetChannel ||
      !targetChannel.isTextBased()
    ) {
      return interaction.editReply(
        "❌ Target channel not found."
      );
    }

    // ======================================
    // FETCH RECENT MESSAGES
    // ======================================

    const messages =
      await stockChannel.messages.fetch({
        limit: 50
      });

    // ======================================
    // FIND THE NEWEST .TXT MESSAGE
    // ======================================

    const stockMessages =
      [...messages.values()]
        .filter((message) => {

          if (message.author.bot) {
            return false;
          }

          return [
            ...message.attachments.values()
          ].some((attachment) => {

            const name =
              attachment.name || "";

            return name
              .toLowerCase()
              .endsWith(".txt");
          });

        })
        .sort(
          (a, b) =>
            b.createdTimestamp -
            a.createdTimestamp
        );

    const stockMessage =
      stockMessages[0];

    // ======================================
    // NO FILE
    // ======================================

    if (!stockMessage) {
      return interaction.editReply(
        "❌ No .txt stock file found in the stock channel."
      );
    }

    // ======================================
    // PROCESS FILES
    // ======================================

    let processedCount = 0;

    for (
      const attachment
      of stockMessage.attachments.values()
    ) {

      const originalFilename =
        attachment.name || "stock.txt";

      // Only TXT files
      if (
        !originalFilename
          .toLowerCase()
          .endsWith(".txt")
      ) {
        continue;
      }

      // ====================================
      // DOWNLOAD FILE
      // ====================================

      const response =
        await fetch(attachment.url);

      if (!response.ok) {

        console.error(
          `❌ Failed to download ${originalFilename}`
        );

        continue;
      }

      const fileBuffer =
        Buffer.from(
          await response.arrayBuffer()
        );

      const originalText =
        fileBuffer.toString("utf8");

      // ====================================
      // REMOVE FIRST 6 LINES
      // ====================================

      const lines =
        originalText.split(/\r?\n/);

      const remainingLines =
        lines.slice(6);

      // ====================================
      // BRANDING IN PLACE OF FIRST 6 LINES
      // ====================================

      const topBranding =
        BRANDING + "\n\n";

      // ====================================
      // BRANDING AT END
      // ====================================

      const bottomBranding =
        "\n\n----------------------------------------\n" +
        BRANDING +
        "\n----------------------------------------";

      // ====================================
      // FINAL FILE
      // ====================================

      const finalText =
        topBranding +
        remainingLines
          .join("\n")
          .trim() +
        bottomBranding;

      // ====================================
      // AUTOMATIC FILE NAME
      // ====================================

      const outputFilename =
        `${commandName.toUpperCase()}-by-oxaam.txt`;

      // ====================================
      // CREATE FILE
      // ====================================

      const outputFile =
        new AttachmentBuilder(
          Buffer.from(
            finalText,
            "utf8"
          ),
          {
            name: outputFilename
          }
        );

      // ====================================
      // SEND FILE
      // ====================================

      await targetChannel.send({
        content:
          `📦 **${commandName.toUpperCase()} STOCK**\n` +
          `━━━━━━━━━━━━━━━━━━━━`,
        files: [outputFile]
      });

      processedCount++;
    }

    // ======================================
    // NOTHING PROCESSED
    // ======================================

    if (processedCount === 0) {

      return interaction.editReply(
        "❌ No valid .txt file could be processed."
      );
    }

    // ======================================
    // SUCCESS
    // ======================================

    await interaction.editReply(
      `✅ Successfully processed ${processedCount} file(s).\n` +
      `📁 Latest .txt file selected.\n` +
      `✂️ First 6 lines replaced with branding.\n` +
      `💲 Branding added at the end too.\n` +
      `📤 Sent to <#${targetChannelId}>.`
    );

  } catch (error) {

    console.error(
      "❌ STOCK PROCESSING ERROR:"
    );

    console.error(error);

    try {

      await interaction.editReply(
        "❌ Something went wrong while processing the stock file."
      );

    } catch (replyError) {

      console.error(
        "❌ Could not send error reply:"
      );

      console.error(replyError);
    }
  }
});

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);
