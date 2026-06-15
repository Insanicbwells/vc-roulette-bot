const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  const commands = [
    new SlashCommandBuilder()
      .setName("roulette")
      .setDescription("Randomly eliminate someone from your VC")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("Commands registered");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "roulette") {
    const vc = interaction.member.voice.channel;

    if (!vc) {
      return interaction.reply({
        content: "Join a VC first.",
        ephemeral: true
      });
    }

    const members = [...vc.members.values()].filter(
      m => !m.user.bot
    );

    if (members.length < 2) {
      return interaction.reply(
        "Need at least 2 people in VC."
      );
    }

    const loser =
      members[Math.floor(Math.random() * members.length)];

    await loser.voice.disconnect();

    await interaction.reply(
      `💀 ${loser.user.username} has been eliminated!`
    );
  }
});

client.login(TOKEN);