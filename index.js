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

// =====================================================
// WEB SERVER
// =====================================================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("OXAAM REWARDS STOCK BOT IS ONLINE!");
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

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

// =====================================================
// DESTINATION CHANNELS
// =====================================================

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

// =====================================================
// BRANDING
// =====================================================

const BRANDING = [
  "MADE BY OXAAM REWARDS 💲",
  "FOUNDER - dhruvop263",
  "Discord: https://discord.gg/8uGcS6V4vV"
].join("\n");

// =====================================================
// DISCORD CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =====================================================
// LATEST STOCK
// =====================================================

let latestStock = null;

// =====================================================
// GET TXT ATTACHMENTS
// =====================================================

function getTxtAttachments(message) {
  if (!message) {
    return [];
  }

  if (message.author?.bot) {
    return [];
  }

  if (message.channelId !== STOCK_CHANNEL_ID) {
    return [];
  }

  return [...message.attachments.values()].filter((attachment) => {
    const name = attachment.name || "";

    return name.toLowerCase().endsWith(".txt");
  });
}

// =====================================================
// SAVE LATEST STOCK
// =====================================================

function rememberStock(message) {
  if (!message) {
    return;
  }

  if (message.author?.bot) {
    return;
  }

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
      name: attachment.name || "stock.txt",
      size: attachment.size || 0
    }))
  };

  console.log("======================================");
  console.log("📦 NEW LATEST STOCK DETECTED");
  console.log(`🆔 Message ID: ${latestStock.messageId}`);

  for (const file of latestStock.attachments) {
    console.log(`📄 File: ${file.name}`);
    console.log(`📦 Size: ${file.size} bytes`);
  }

  console.log("======================================");
}

// =====================================================
// TEXT DECODER
// =====================================================

function decodeText(buffer) {
  // UTF-8 BOM
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return {
      text: buffer.subarray(3).toString("utf8"),
      encoding: "UTF-8 BOM"
    };
  }

  // UTF-16 LE BOM
  if (
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xfe
  ) {
    return {
      text: buffer.subarray(2).toString("utf16le"),
      encoding: "UTF-16 LE"
    };
  }

  // UTF-16 BE BOM
  if (
    buffer.length >= 2 &&
    buffer[0] === 0xfe &&
    buffer[1] === 0xff
  ) {
    const data = buffer.subarray(2);

    const swapped = Buffer.alloc(data.length);

    for (let i = 0; i + 1 < data.length; i += 2) {
      swapped[i] = data[i + 1];
      swapped[i + 1] = data[i];
    }

    return {
      text: swapped.toString("utf16le"),
      encoding: "UTF-16 BE"
    };
  }

  // Normal UTF-8
  return {
    text: buffer.toString("utf8"),
    encoding: "UTF-8"
  };
}

// =====================================================
// DOWNLOAD ORIGINAL FILE
// =====================================================

async function downloadFile(url) {
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

// =====================================================
// PROCESS SAFE TEXT FILE
// =====================================================

function processTextFile(originalBuffer) {
  const decoded = decodeText(originalBuffer);

  console.log(`📝 Detected encoding: ${decoded.encoding}`);
  console.log(`📦 Original size: ${originalBuffer.length} bytes`);

  const lines = decoded.text.split(/\r?\n/);

  console.log(`📄 Original line count: ${lines.length}`);

  // Remove first 6 lines
  const remainingLines = lines.slice(6);

  const body = remainingLines.join("\n").trim();

  const finalText =
    BRANDING +
    "\n\n" +
    body +
    "\n\n----------------------------------------\n" +
    BRANDING +
    "\n----------------------------------------\n";

  const outputBuffer = Buffer.from(finalText, "utf8");

  console.log(`📦 Output size: ${outputBuffer.length} bytes`);

  return outputBuffer;
}

// =====================================================
// SLASH COMMANDS
// =====================================================

const stockCommands = Object.keys(DESTINATIONS).map((name) => {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(`Send latest ${name} text stock`)
    .toJSON();
});

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

// =====================================================
// HEARTBEAT
// =====================================================

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
    `💓 Heartbeat | Uptime: ${hours}h ${minutes}m ${seconds}s`
  );
}, 5 * 60 * 1000);

// =====================================================
// READY
// =====================================================

client.once("ready", async () => {
  console.log("======================================");
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("======================================");

  // ---------------------------------------------------
  // REGISTER SLASH COMMANDS
  // ---------------------------------------------------

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

    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Command registration failed:");
    console.error(error);
  }

  // ---------------------------------------------------
  // RECOVER LATEST FILE AFTER RESTART
  // ---------------------------------------------------

  try {
    console.log("🔎 Searching stock channel for latest TXT...");

    const stockChannel = await client.channels.fetch(
      STOCK_CHANNEL_ID
    );

    if (!stockChannel || !stockChannel.isTextBased()) {
      console.error("❌ Stock channel is not text based.");
      return;
    }

    const messages = await stockChannel.messages.fetch({
      limit: 100
    });

    const stockMessages = [...messages.values()]
      .filter((message) => {
        return getTxtAttachments(message).length > 0;
      })
      .sort((a, b) => {
        return b.createdTimestamp - a.createdTimestamp;
      });

    if (stockMessages.length > 0) {
      rememberStock(stockMessages[0]);

      console.log(
        `✅ Latest stock recovered: ${stockMessages[0].id}`
      );
    } else {
      console.log("📭 No TXT stock found.");
    }

  } catch (error) {
    console.error("❌ Could not recover latest stock:");
    console.error(error);
  }
});

// =====================================================
// NEW MESSAGE
// =====================================================

client.on("messageCreate", (message) => {
  rememberStock(message);
});

// =====================================================
// MESSAGE UPDATE
// =====================================================

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    const fullMessage = newMessage.partial
      ? await newMessage.fetch()
      : newMessage;

    rememberStock(fullMessage);

  } catch (error) {
    console.error("❌ Message update error:");
    console.error(error);
  }
});

// =====================================================
// INTERACTION
// =====================================================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) {
    return;
  }

  // ===================================================
  // /MSG
  // ===================================================

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

  // ===================================================
  // STOCK COMMAND
  // ===================================================

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

    // -------------------------------------------------
    // CHECK LATEST STOCK
    // -------------------------------------------------

    if (!latestStock) {

      return interaction.editReply(
        "❌ No stock file has been uploaded yet."
      );

    }

    console.log("======================================");
    console.log("📤 STOCK REQUEST");
    console.log(`⚡ Command: /${commandName}`);
    console.log(`🆔 Source Message: ${latestStock.messageId}`);

    for (const file of latestStock.attachments) {
      console.log(`📄 Source File: ${file.name}`);
      console.log(`📦 Source Size: ${file.size} bytes`);
    }

    console.log("======================================");

    // -------------------------------------------------
    // TARGET CHANNEL
    // -------------------------------------------------

    const targetChannel =
      await client.channels.fetch(targetChannelId);

    if (
      !targetChannel ||
      !targetChannel.isTextBased()
    ) {

      return interaction.editReply(
        "❌ Target channel not found."
      );

    }

    // -------------------------------------------------
    // PROCESS FILES
    // -------------------------------------------------

    let processedCount = 0;

    for (const attachment of latestStock.attachments) {

      console.log(
        `⬇️ Downloading: ${attachment.name}`
      );

      const originalBuffer =
        await downloadFile(attachment.url);

      console.log(
        `📦 Downloaded: ${originalBuffer.length} bytes`
      );

      // ------------------------------------------------
      // PROCESS TEXT
      // ------------------------------------------------

      const outputBuffer =
        processTextFile(originalBuffer);

      // ------------------------------------------------
      // OUTPUT NAME
      // ------------------------------------------------

      const outputFilename =
        `${commandName.toUpperCase()}-by-oxaam.txt`;

      const outputFile =
        new AttachmentBuilder(
          outputBuffer,
          {
            name: outputFilename
          }
        );

      // ------------------------------------------------
      // SEND
      // ------------------------------------------------

      await targetChannel.send({
        content:
          `📦 **${commandName.toUpperCase()} STOCK**\n` +
          `━━━━━━━━━━━━━━━━━━━━`,
        files: [outputFile]
      });

      console.log(
        `✅ Sent: ${outputFilename}`
      );

      processedCount++;
    }

    // -------------------------------------------------
    // RESULT
    // -------------------------------------------------

    if (processedCount === 0) {

      return interaction.editReply(
        "❌ No valid TXT file was processed."
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

    console.error("======================================");
    console.error("❌ STOCK PROCESSING ERROR");
    console.error(error);
    console.error("======================================");

    try {

      await interaction.editReply(
        "❌ Something went wrong while processing the stock file."
      );

    } catch (replyError) {

      console.error(replyError);

    }
  }
});

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN);
