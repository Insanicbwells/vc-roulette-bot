const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Put YOUR Discord user ID here so the bot never kicks you
const HOST_ID = "1262320890893438977";

const activeRoulettes = new Map();

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
      .toJSON(),

    new SlashCommandBuilder()
      .setName("startroulette")
      .setDescription("Automatically eliminate someone every 30 seconds")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("stoproulette")
      .setDescription("Stop the automatic roulette")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  console.log("Commands registered");
});

function placeSuffix(num) {
  if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
  if (num % 10 === 1) return `${num}st`;
  if (num % 10 === 2) return `${num}nd`;
  if (num % 10 === 3) return `${num}rd`;
  return `${num}th`;
}

function getPlayers(vc) {
  return [...vc.members.values()].filter(
    m => !m.user.bot && m.id !== HOST_ID
  );
}

async function eliminateRandom(vc) {
  const members = getPlayers(vc);
  if (members.length < 1) return null;

  const loser = members[Math.floor(Math.random() * members.length)];
  await loser.voice.disconnect();
  return loser;
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guild.id;

  if (interaction.commandName === "roulette") {
    const vc = interaction.member.voice.channel;

    if (!vc) {
      return interaction.reply({
        content: "Join a VC first.",
        ephemeral: true
      });
    }

    const totalPlayers = getPlayers(vc).length;

    if (totalPlayers < 1) {
      return interaction.reply({
        content: "Nobody can be eliminated.",
        ephemeral: true
      });
    }

    const loser = await eliminateRandom(vc);

    return interaction.reply(
      `🎲 Spinning...\n💀 ${loser.user.username} was eliminated! ${placeSuffix(totalPlayers)} place.`
    );
  }

  if (interaction.commandName === "startroulette") {
    const vc = interaction.member.voice.channel;

    if (!vc) {
      return interaction.reply({
        content: "Join a VC first.",
        ephemeral: true
      });
    }

    if (activeRoulettes.has(guildId)) {
      return interaction.reply({
        content: "Roulette is already running.",
        ephemeral: true
      });
    }

    const startingPlayers = getPlayers(vc).length;

    if (startingPlayers < 2) {
      return interaction.reply({
        content: "Need at least 2 people who can be eliminated.",
        ephemeral: true
      });
    }

    await interaction.reply(
      `🎲 Automatic roulette started with ${startingPlayers} players! Eliminating someone every 30 seconds.`
    );

    const interval = setInterval(async () => {
      const members = getPlayers(vc);

      if (members.length <= 1) {
        clearInterval(interval);
        activeRoulettes.delete(guildId);

        const winner = members[0];

        if (winner) {
          interaction.channel.send(
            `🏆 ${winner.user.username} wins! ${placeSuffix(1)} place.`
          );
        } else {
          interaction.channel.send("Roulette ended. Nobody is left.");
        }

        return;
      }

      try {
        const placement = members.length;
        const loser = await eliminateRandom(vc);

        if (loser) {
          interaction.channel.send(
            `💀 ${loser.user.username} was eliminated! ${placeSuffix(placement)} place.`
          );
        }
      } catch (err) {
        console.error(err);
        interaction.channel.send(
          "I couldn't eliminate someone. Check my Move Members permission."
        );
      }
    }, 30000);

    activeRoulettes.set(guildId, interval);
  }

  if (interaction.commandName === "stoproulette") {
    if (!activeRoulettes.has(guildId)) {
      return interaction.reply({
        content: "No roulette is running.",
        ephemeral: true
      });
    }

    clearInterval(activeRoulettes.get(guildId));
    activeRoulettes.delete(guildId);

    return interaction.reply("🛑 Roulette stopped.");
  }
});

client.login(TOKEN);
