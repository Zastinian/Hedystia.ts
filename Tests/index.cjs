const { Client, Intents, Status } = require("../Package/dist/index.js");
const config = require("./config.test.cjs");

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

client
  .login()
  .then(() => {
    console.log("Client connected!");
  })
  .catch(console.error);
