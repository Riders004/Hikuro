const Facebook = require("erela.js-facebook");
const AppleMusic = require("erela.js-apple");
const Spotify = require("erela.js-spotify");
const Deezer = require("erela.js-deezer");
const { Manager } = require("erela.js");
const Discord = require("discord.js");
const fs = require("fs");

const client = new Discord.Client({
  allowedMentions: {
    parse: ["users", "roles"],
    repliedUser: true,
  },
  autoReconnect: true,
  disabledEvents: ["TYPING_START"],
  partials: [
    Discord.Partials.Channel,
    Discord.Partials.GuildMember,
    Discord.Partials.Message,
    Discord.Partials.Reaction,
    Discord.Partials.User,
    Discord.Partials.GuildScheduledEvent,
  ],
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildBans,
    Discord.GatewayIntentBits.GuildEmojisAndStickers,
    Discord.GatewayIntentBits.GuildIntegrations,
    Discord.GatewayIntentBits.GuildWebhooks,
    Discord.GatewayIntentBits.GuildInvites,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.DirectMessages,
    Discord.GatewayIntentBits.DirectMessageReactions,
    Discord.GatewayIntentBits.DirectMessageTyping,
    Discord.GatewayIntentBits.GuildScheduledEvents,
    Discord.GatewayIntentBits.MessageContent,
  ],
  restTimeOffset: 0,
});

const setupLavalinkClient = () => {
  const nodes = [
    {
      host: process.env.LAVALINK_HOST || "lava.link",
      port: parseInt(process.env.LAVALINK_PORT) || 80,
      password: process.env.LAVALINK_PASSWORD || "CorwinDev",
      secure: Boolean(process.env.LAVALINK_SECURE) || false,
    },
  ];

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    nodes.push({
      host: "lavalink.techpoint.world",
      port: 80,
      password: "techpoint",
    });

    client.player.plugins.push(
      new Spotify({
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      })
    );
  }

  client.player.nodes = nodes;
};

const loadMusicEvents = () => {
  const eventFiles = fs
    .readdirSync("./events/music")
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const eventName = file.split(".")[0];
    const eventHandler = require(`./events/music/${file}`);
    client.player
      .on(eventName, eventHandler.bind(null, client))
      .setMaxListeners(0);
  }
};

const connectToDatabase = () => {
  require("./database/connect")();
};

const setupWebhooks = () => {
  const webHooksArray = [
    "startLogs",
    "shardLogs",
    "errorLogs",
    "dmLogs",
    "voiceLogs",
    "serverLogs",
    "serverLogs2",
    "commandLogs",
    "consoleLogs",
    "warnLogs",
    "voiceErrorLogs",
    "creditLogs",
    "evalLogs",
    "interactionLogs",
  ];
  if (process.env.WEBHOOK_ID && process.env.WEBHOOK_TOKEN) {
    for (const webhookName of webHooksArray) {
      client.webhooks[webhookName].id = process.env.WEBHOOK_ID;
      client.webhooks[webhookName].token = process.env.WEBHOOK_TOKEN;
    }
  }
};

const loadHandlers = () => {
  const handlerDirs = fs.readdirSync("./handlers");

  for (const dir of handlerDirs) {
    const handlerFiles = fs.readdirSync(`./handlers/${dir}`);

    for (const file of handlerFiles) {
      const handlerPath = `./handlers/${dir}/${file}`;
      const handler = require(handlerPath);
      handler(client);
    }
  }
};

const setupErrorHandlers = () => {
  client.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
    if (error && error.length > 950) {
      error = error.slice(0, 950) + "... view console for details";
    }
    if (error && error.stack && error.stack.length > 950) {
      error.stack = error.stack.slice(0, 950) + "... view console for details";
    }
    if (!error.stack) return;

    const embed = new Discord.EmbedBuilder()
      .setTitle("🚨・Unhandled promise rejection")
      .addFields([
        {
          name: "Error",
          value: error ? Discord.codeBlock(error) : "No error",
        },
        {
          name: "Stack error",
          value: error.stack
            ? Discord.codeBlock(error.stack)
            : "No stack error",
        },
      ])
      .setColor(client.config.colors.normal);

    consoleLogs
      .send({
        username: "Bot Logs",
        embeds: [embed],
      })
      .catch(() => {
        console.log("Error sending unhandledRejection to webhook");
        console.log(error);
      });
  });

  process.on("warning", (warn) => {
    console.warn("Warning:", warn);
    const embed = new Discord.EmbedBuilder()
      .setTitle("🚨・New warning found")
      .addFields([
        {
          name: "Warn",
          value: `\`\`\`${warn}\`\`\``,
        },
      ])
      .setColor(client.config.colors.normal);

    warnLogs
      .send({
        username: "Bot Logs",
        embeds: [embed],
      })
      .catch(() => {
        console.log("Error sending warning to webhook");
        console.log(warn);
      });
  });

  client.on(Discord.ShardEvents.Error, (error) => {
    console.log(error);
    if (error && error.length > 950) {
      error = error.slice(0, 950) + "... view console for details";
    }
    if (error && error.stack && error.stack.length > 950) {
      error.stack = error.stack.slice(0, 950) + "... view console for details";
    }
    if (!error.stack) return;

    const embed = new Discord.EmbedBuilder()
      .setTitle("🚨・A websocket connection encountered an error")
      .addFields([
        {
          name: "Error",
          value: `\`\`\`${error}\`\`\``,
        },
        {
          name: "Stack error",
          value: `\`\`\`${error.stack}\`\`\``,
        },
      ])
      .setColor(client.config.colors.normal);

    consoleLogs.send({
      username: "Bot Logs",
      embeds: [embed],
    });
  });
};

client.player = new Manager({
  plugins: [new AppleMusic(), new Deezer(), new Facebook()],
  nodes: [],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

setupLavalinkClient();
loadMusicEvents();
connectToDatabase();

client.config = require("./config/bot");
client.changelogs = require("./config/changelogs");
client.emotes = require("./database/json/emojis.json");
client.webhooks = require("./database/json/webhooks.json");
setupWebhooks();

client.commands = new Discord.Collection();
client.playerManager = new Map();
client.triviaManager = new Map();
client.queue = new Map();

const consoleLogs = new Discord.WebhookClient({
  id: client.webhooks.consoleLogs.id,
  token: client.webhooks.consoleLogs.token,
});

const warnLogs = new Discord.WebhookClient({
  id: client.webhooks.warnLogs.id,
  token: client.webhooks.warnLogs.token,
});
loadHandlers();
client.login(process.env.DISCORD_TOKEN);
setupErrorHandlers();
