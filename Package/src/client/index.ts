import REST from "@/rest";
import EventEmitter from "node:events";
import type Intents from "@/utils/intents";
import type { ClientEvents } from "@/types/ClientEvents";
import {
  PresenceUpdateStatus,
  type ActivityType,
  type APIGatewayBotInfo,
  type APIUser,
  type PresenceUpdateReceiveStatus,
} from "discord-api-types/v10";
import type { ClientOptions as WebSocketOptions } from "ws";
import ShardManager from "./ShardManager";
import { Routes } from "@/utils/constants";
import type { Presence } from "@/types/Gateway";
import GuildManager from "@/managers/GuildManager";

export interface ClientOptions {
  token: string;
  intents?: number | Array<number>;
  presence?: {
    activities: Activities[];
    status: PresenceUpdateReceiveStatus;
  };
  shards?: number | number[] | "auto";
  shardCount?: number;
  ws?: WebSocketOptions;
  compress?: boolean;
  largeThreshold?: number;
  shardsCount?: number | "auto";
  cache?:
    | {
        guilds: boolean;
      }
    | boolean;
}

interface Activities {
  name: string;
  type: ActivityType;
  url?: string;
  state?: string;
}

type KnownCacheKeys = "guilds";

export default class Client extends EventEmitter<ClientEvents> {
  token: string;
  intents: Intents | number;
  rest: REST;
  presence: {
    activities: Activities[];
    status: PresenceUpdateReceiveStatus;
  };
  readyAt!: Date;
  me?: APIUser;
  ws?: WebSocketOptions;
  compress?: boolean;
  largeThreshold?: number;
  shardsCount: number | "auto";
  shards: Map<number, ShardManager>;
  cache:
    | {
        guilds: boolean;
      }
    | boolean;

  constructor(options: ClientOptions) {
    super();

    this.token = `Bot ${options.token}`;

    this.intents =
      options.intents !== undefined
        ? Array.isArray(options.intents)
          ? options.intents.reduce((sum, num) => sum + num, 0)
          : options.intents
        : 0;

    this.compress = options.compress;
    this.largeThreshold = options.largeThreshold;
    this.shardsCount = options.shardsCount ?? "auto";

    this.shards = new Map();

    this.rest = new REST({
      token: this.token,
      version: 10,
      restRequestTimeout: 10000,
    });

    this.presence = {
      activities: [...(options.presence?.activities ?? [])],
      status: options.presence?.status ?? PresenceUpdateStatus.Online,
    };

    this.ws = options?.ws;

    this.cache = options?.cache ?? true;
  }

  /**
   * Logs in to the gateway
   * @link https://discord.com/developers/docs/topics/gateway#connecting
   */
  async login(): Promise<void> {
    this.shardsCount =
      this.shardsCount === "auto" ? (await this.getGatewayBot()).shards : this.shardsCount;

    for (let i = 0; i < this.shardsCount; i++) this.shards.set(i, new ShardManager(i, this));

    for (const [_, shard] of this.shards) shard.connect();
  }

  disconnect(): void {
    for (const [_, shard] of this.shards) shard.disconnect();
  }

  get uptime(): number {
    if (!this.readyAt) throw new Error("Client is not ready");
    return Date.now() - this.readyAt.getTime();
  }

  get isReady(): boolean {
    return this.readyAt !== undefined;
  }

  get readyTimestamp(): number {
    if (!this.readyAt) throw new Error("Client is not ready");
    return this.readyAt.getTime();
  }

  /**
   * Updates the presence of the bot
   * @param {Partial<Pick<Presence, "activities" | "status">>} options The options to update the presence with
   * @link https://discord.com/developers/docs/topics/gateway#update-presence
   */
  updatePresence(options: Partial<Pick<Presence, "activities" | "status">>): void {
    for (const [_, shard] of this.shards) shard.updatePresence(options);
  }

  async getGatewayBot(): Promise<{
    url: string;
    shards: number;
    sessionStartLimit: {
      total: number;
      remaining: number;
      resetAfter: number;
      maxConcurrency: number;
    };
  }> {
    const response = (await this.rest.get(Routes.gatewayBot())) as APIGatewayBotInfo;
    return {
      url: response.url,
      shards: response.shards,
      sessionStartLimit: {
        total: response.session_start_limit.total,
        remaining: response.session_start_limit.remaining,
        resetAfter: response.session_start_limit.reset_after,
        maxConcurrency: response.session_start_limit.max_concurrency,
      },
    };
  }

  isCacheEnabled<K extends KnownCacheKeys>(key: K, override?: boolean): boolean {
    if (override !== undefined) return override;
    if (this.cache === false) return false;
    if (typeof this.cache === "object") return this.cache[key] ?? true;
    return this.cache;
  }

  /**
   * Gets the guilds cache
   * @returns {GuildManager} The guilds cache
   */
  get guilds(): GuildManager {
    return new GuildManager(this);
  }
}
