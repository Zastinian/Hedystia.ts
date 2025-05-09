import { Client, Intents, Status } from "../Package/src/index";
import config from "./config.test";

const client = new Client({
  token: config.token,
  intents: [Intents.guilds, Intents.guildMessages],
  shards: "auto",
  presence: {
    activities: [],
    status: Status.DoNotDisturb,
  },
});

client.once("ready", (r) => {
  console.log(r.user.username);
});

client.on("shardReady", (shardId) => {
  console.log(`Shard ${shardId} is ready`);
});

client.on("shardDisconnect", ({ id, code }) => {
  console.log(`Shard ${id} disconnected with code ${code}`);
});

client.on("shardReconnecting", (shardId) => {
  console.log(`Shard ${shardId} is trying to reconnect`);
});

client.on("shardError", ({ id, error }) => {
  console.error(`Error in shard ${id}:`, error);
});

client.on("guildDelete", (guild) => {
  // Check if the guild is cached
  if ("name" in guild) {
    return console.log(guild.owner_id);
  }
  console.log(guild.id);
});

client
  .login()
  .then(() => {
    console.log("Client connected!");
  })
  .catch(console.error);
