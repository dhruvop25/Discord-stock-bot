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
// LATEST STOCK FILE
// ==========================================

let latestStock = null;

// ==========================================
// CHECK TXT ATTACHMENTS
// ==========================================

function getTxtAttachments(message) {
  if (!message || message.author?.bot) {
    return [];
  }

  return [...message.attachments.values()].filter(
    (attachment) => {
      const name = attachment.name || "";

      return name
        .toLowerCase()
        .endsWith(".txt");
    }
  );
}

// ==========================================
// REMEMBER LATEST STOCK
// ==========================================

function rememberStock(message) {
  if (!message) return;

  if (message.channelId !== STOCK_CHANNEL_ID) {
    return;
  }

  const attachments = getTxtAttachments(message);

  if (attachments.length === 0) {
    return;
  }

  latestStock = {
    messageId: message.id,
    createdTimestamp: message.createdTimestamp,
    attachments: attachments.map((attachment) => ({
      url: attachment.url,
      name: attachment.name || "stock.txt"
    }))
  };

  console.log(
    `📦 New latest stock detected: ${latestStock.attachments
      .map((a) => a.name)
      .join(", ")}`
  );
}

// ==========================================
// SLASH COMMANDS
// ==========================================

const stockCommands = Object.keys(DESTINATIONS).map((name) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(`Send latest ${name} text stock`)
    .toJSON()
);

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

  const hours = Math.floor(
    uptimeSeconds / 3600
  );

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

  // ----------------------------------------
  // REGISTER COMMANDS
  // ----------------------------------------

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

  // ----------------------------------------
  // RECOVER LATEST STOCK AFTER RESTART
  // ----------------------------------------

  try {
    const stockChannel =
      await client.channels.fetch(
        STOCK_CHANNEL_ID
      );

    if (
      stockChannel &&
      stockChannel.isTextBased()
    ) {
      const messages =
        await stockChannel.messages.fetch({
          limit: 100
        });

      const stockMessages =
        [...messages.values()]
          .filter((message) => {
            return getTxtAttachments(message).length > 0;
          })
          .sort(
            (a, b) =>
              b.createdTimestamp -
              a.createdTimestamp
          );

      if (stockMessages.length > 0) {
        rememberStock(stockMessages[0]);

        console.log(
          `📦 Recovered latest stock after restart: ${stockMessages[0].id}`
        );
      } else {
        console.log(
          "📭 No TXT stock found during startup."
        );
      }
    }
  } catch (error) {
    console.error(
      "❌ Could not recover latest stock:"
    );
    console.error(error);
  }
});

// ==========================================
// NEW MESSAGE = NEW STOCK
// ==========================================

client.on("messageCreate", (message) => {
  rememberStock(message);
});

// ==========================================
// EDITED MESSAGE = POSSIBLY NEW STOCK
// ==========================================

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    const fullMessage =
      newMessage.partial
        ? await newMessage.fetch()
        : newMessage;

    rememberStock(fullMessage);
  } catch (error) {
    console.error(
      "❌ Error checking updated stock message:"
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
    // CHECK LATEST STOCK
    // ======================================

    if (!latestStock) {
      return interaction.editReply(
        "❌ No stock file has been uploaded yet."
      );
    }

    console.log(
      `📤 Sending latest stock: ${latestStock.messageId}`
    );

    let processedCount = 0;

    // ======================================
    // PROCESS LATEST ATTACHMENTS
    // ======================================

    for (
      const attachment
      of latestStock.attachments
    ) {

      const response =
        await fetch(attachment.url);

      if (!response.ok) {
        console.error(
          `❌ Failed to download ${attachment.name}`
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
      // BRANDING AT TOP
      // ====================================

      const topBranding =
        BRANDING + "\n\n";

      // ====================================
      // BRANDING AT BOTTOM
      // ====================================

      const bottomBranding =
        "\n\n----------------------------------------\n" +
        BRANDING +
        "\n----------------------------------------";

      // ====================================
      // FINAL TEXT
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
      // CREATE OUTPUT FILE
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
    // RESULT
    // ======================================

    if (processedCount === 0) {
      return interaction.editReply(
        "❌ No valid TXT attachment could be processed."
      );
    }

    await interaction.editReply(
      `✅ Latest stock processed successfully!\n` +
      `✂️ First 6 lines removed.\n` +
      `💲 Branding added.\n` +
      `📁 Filename: ${commandName.toUpperCase()}-by-oxaam.txt\n` +
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
      console.error(replyError);
    }
  }
});

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);
