const express = require("express");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Oxaam Rewards Bot is online!");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

const TOKEN = process.env.DISCORD_TOKEN;
const STOCK_CHANNEL_ID = process.env.STOCK_CHANNEL_ID;

if (!TOKEN) {
  console.error("DISCORD_TOKEN is missing!");
  process.exit(1);
}

if (!STOCK_CHANNEL_ID) {
  console.error("STOCK_CHANNEL_ID is missing!");
  process.exit(1);
}

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

const BRANDING = `MADE BY OXAAM REWARDS 💲
FOUNDER - dhruvop263
Discord: https://discord.gg/8uGcS6V4vV`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = Object.keys(DESTINATIONS).map((name) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(`Send the latest ${name} stock file`)
    .toJSON()
);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Slash commands registered successfully!");
  } catch (error) {
    console.error("Slash command registration error:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const targetId = DESTINATIONS[commandName];

  if (!targetId) {
    return interaction.reply({
      content: "❌ Unknown command.",
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const stockChannel = await client.channels.fetch(STOCK_CHANNEL_ID);
    const targetChannel = await client.channels.fetch(targetId);

    if (!stockChannel || !targetChannel) {
      return interaction.editReply(
        "❌ Stock channel or target channel was not found."
      );
    }

    const messages = await stockChannel.messages.fetch({ limit: 50 });

    const stockMessage = messages.find(
      (message) =>
        !message.author.bot &&
        message.attachments &&
        message.attachments.size > 0
    );

    if (!stockMessage) {
      return interaction.editReply(
        "❌ No stock file was found in the stock channel."
      );
    }

    const files = [];

    for (const attachment of stockMessage.attachments.values()) {
      files.push({
        attachment: attachment.url,
        name: attachment.name || "stock.txt"
      });
    }

    await targetChannel.send({
      content:
        `📦 **${commandName.toUpperCase()} STOCK**\n\n` +
        `${BRANDING}`,
      files
    });

    await interaction.editReply(
      `✅ ${commandName.toUpperCase()} stock sent successfully!`
    );

  } catch (error) {
    console.error(error);

    await interaction.editReply(
      "❌ Something went wrong. Check the Render logs."
    );
  }
});

client.login(TOKEN);
