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
// WEB SERVER - FOR RENDER
// ==========================================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("OXAAM REWARDS STOCK BOT IS ONLINE!");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
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

    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Slash command registration error:");
    console.error(error);
  }
});

// ==========================================
// INTERACTION HANDLER
// ==========================================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  // ========================================
  // /MSG COMMAND
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
  // STOCK COMMANDS
 
