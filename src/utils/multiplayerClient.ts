import {createClient, RealtimeChannel, SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../config/supabase';
import {
  CoinGiftEvent,
  OnlinePlayerMeta,
  OnlinePlayerPosePacket,
  OnlinePlayerState,
  ZoneId,
} from '../types/game';

export function isPublicMultiplayerZone(zone: ZoneId): boolean {
  return zone !== 'home' && zone !== 'garden';
}

export type MultiplayerTransportKind = 'supabase' | 'websocket' | 'offline';
export type MultiplayerConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type RosterListener = (players: Map<string, OnlinePlayerState>) => void;
type PoseListener = (packet: OnlinePlayerPosePacket) => void;
type GiftListener = (gift: CoinGiftEvent) => void;
type StatusListener = (status: MultiplayerConnectionStatus, transport: MultiplayerTransportKind) => void;

const CHANNEL_NAME = 'ttm_online_world_v1';
const STALE_PLAYER_MS = 28000;

let cachedSupabaseClient: SupabaseClient | null = null;
let cachedSupabaseUrl = '';
let cachedSupabaseKey = '';

function getSupabaseRealtimeClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return null;
  if (
    cachedSupabaseClient &&
    cachedSupabaseUrl === cfg.url &&
    cachedSupabaseKey === cfg.anonKey
  ) {
    return cachedSupabaseClient;
  }
  cachedSupabaseUrl = cfg.url;
  cachedSupabaseKey = cfg.anonKey;
  cachedSupabaseClient = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 30,
      },
    },
  });
  return cachedSupabaseClient;
}

function createTabPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    return `plr_${Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `plr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const LOCAL_CLIENT_ID = createTabPlayerId();

export function getLocalMultiplayerClientId(): string {
  return LOCAL_CLIENT_ID;
}

class TownMultiplayerClient {
  private players = new Map<string, OnlinePlayerState>();
  private rosterListeners = new Set<RosterListener>();
  private poseListeners = new Set<PoseListener>();
  private giftListeners = new Set<GiftListener>();
  private statusListeners = new Set<StatusListener>();

  private status: MultiplayerConnectionStatus = 'disconnected';
  private transport: MultiplayerTransportKind = 'offline';
  private started = false;
  private localMeta: OnlinePlayerMeta | null = null;
  private lastPosePacket: OnlinePlayerPosePacket | null = null;

  private supabaseChannel: RealtimeChannel | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: number | null = null;
  private stalePruneTimer: number | null = null;
  private poseSeq = 0;
  private lastPoseSentAt = 0;
  private lastPoseZone: ZoneId | null = null;
  private lastPoseKind: string | null = null;
  private seenGiftTxIds = new Set<string>();

  public getStatus(): {status: MultiplayerConnectionStatus; transport: MultiplayerTransportKind} {
    return {status: this.status, transport: this.transport};
  }

  public getPlayersSnapshot(): Map<string, OnlinePlayerState> {
    return new Map(this.players);
  }

  public subscribeRoster(cb: RosterListener): () => void {
    this.rosterListeners.add(cb);
    cb(new Map(this.players));
    return () => {
      this.rosterListeners.delete(cb);
    };
  }

  public subscribePose(cb: PoseListener): () => void {
    this.poseListeners.add(cb);
    return () => {
      this.poseListeners.delete(cb);
    };
  }

  public subscribeGift(cb: GiftListener): () => void {
    this.giftListeners.add(cb);
    return () => {
      this.giftListeners.delete(cb);
    };
  }

  public subscribeStatus(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    cb(this.status, this.transport);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  private setStatus(status: MultiplayerConnectionStatus, transport: MultiplayerTransportKind): void {
    if (this.status === status && this.transport === transport) return;
    this.status = status;
    this.transport = transport;
    for (const cb of this.statusListeners) {
      cb(status, transport);
    }
  }

  private emitRoster(): void {
    const copy = new Map(this.players);
    for (const cb of this.rosterListeners) {
      cb(copy);
    }
  }

  public start(initialMeta: OnlinePlayerMeta): void {
    this.localMeta = {...initialMeta, id: LOCAL_CLIENT_ID};
    if (this.started) {
      this.sendMeta(this.localMeta);
      return;
    }
    this.started = true;

    if (this.stalePruneTimer === null) {
      this.stalePruneTimer = window.setInterval(() => {
        const now = Date.now();
        let removed = false;
        for (const [pid, state] of this.players.entries()) {
          if (now - state.lastSeenAt > STALE_PLAYER_MS) {
            this.players.delete(pid);
            removed = true;
          }
        }
        if (removed) this.emitRoster();
      }, 4000);
    }

    const sb = getSupabaseRealtimeClient();
    if (sb) {
      this.connectSupabase(sb);
    } else {
      this.connectWebSocket();
    }
  }

  public stop(): void {
    this.started = false;
    this.players.clear();
    this.emitRoster();

    if (this.stalePruneTimer !== null) {
      window.clearInterval(this.stalePruneTimer);
      this.stalePruneTimer = null;
    }
    if (this.wsReconnectTimer !== null) {
      window.clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.supabaseChannel) {
      const ch = this.supabaseChannel;
      this.supabaseChannel = null;
      void ch.untrack().catch(() => {});
      void ch.unsubscribe().catch(() => {});
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected', 'offline');
  }

  private handleIncomingMeta(meta: OnlinePlayerMeta): void {
    if (!meta || !meta.id || meta.id === LOCAL_CLIENT_ID) return;
    const prev = this.players.get(meta.id);
    if (prev && prev.meta.updatedAt > meta.updatedAt) return;
    this.players.set(meta.id, {
      meta,
      pose: prev?.pose ?? null,
      lastSeenAt: Date.now(),
    });
    this.emitRoster();
  }

  private handleIncomingPose(packet: OnlinePlayerPosePacket): void {
    if (!packet || !packet.id || packet.id === LOCAL_CLIENT_ID) return;
    const existing = this.players.get(packet.id);
    if (existing?.pose && packet.seq < existing.pose.seq && existing.pose.seq - packet.seq < 1000) {
      return;
    }
    if (existing) {
      existing.pose = packet;
      existing.lastSeenAt = Date.now();
      if (existing.meta.zone !== packet.zone) {
        existing.meta = {...existing.meta, zone: packet.zone};
        this.emitRoster();
      }
    } else {
      // Unknown player moving before meta arrived -> request meta!
      this.sendRawEvent('req_meta', {targetId: packet.id, fromId: LOCAL_CLIENT_ID});
    }
    for (const cb of this.poseListeners) {
      cb(packet);
    }
  }

  private handleIncomingGift(gift: CoinGiftEvent): void {
    if (!gift || !gift.txId || this.seenGiftTxIds.has(gift.txId)) return;
    if (!this.localMeta) return;
    const isTarget =
      gift.toPlayerId === LOCAL_CLIENT_ID ||
      (gift.toUsername &&
        this.localMeta.username &&
        gift.toUsername.toLowerCase() === this.localMeta.username.toLowerCase()) ||
      (gift.toAccountId &&
        this.localMeta.accountId &&
        gift.toAccountId === this.localMeta.accountId &&
        gift.fromPlayerId !== LOCAL_CLIENT_ID);

    if (!isTarget) return;
    this.seenGiftTxIds.add(gift.txId);
    if (this.seenGiftTxIds.size > 200) {
      const first = this.seenGiftTxIds.values().next().value;
      if (first) this.seenGiftTxIds.delete(first);
    }
    for (const cb of this.giftListeners) {
      cb(gift);
    }
  }

  private connectSupabase(sb: SupabaseClient): void {
    this.setStatus('connecting', 'supabase');
    const channel = sb.channel(CHANNEL_NAME, {
      config: {
        broadcast: {self: false, ack: false},
        presence: {key: LOCAL_CLIENT_ID},
      },
    });
    this.supabaseChannel = channel;

    channel
      .on('presence', {event: 'sync'}, () => {
        const state = channel.presenceState<OnlinePlayerMeta>();
        const activeIds = new Set<string>();
        let changed = false;

        for (const [key, entries] of Object.entries(state)) {
          if (key === LOCAL_CLIENT_ID) continue;
          const latest = Array.isArray(entries) && entries.length > 0 ? entries[entries.length - 1] : null;
          if (!latest || !latest.avatar) continue;
          activeIds.add(key);
          const prev = this.players.get(key);
          if (!prev) {
            this.players.set(key, {
              meta: {...latest, id: key},
              pose: null,
              lastSeenAt: Date.now(),
            });
            changed = true;
          } else if (latest.updatedAt >= prev.meta.updatedAt) {
            prev.meta = {...latest, id: key};
            prev.lastSeenAt = Date.now();
            changed = true;
          }
        }

        for (const id of Array.from(this.players.keys())) {
          if (!activeIds.has(id)) {
            this.players.delete(id);
            changed = true;
          }
        }
        if (changed) this.emitRoster();
      })
      .on('presence', {event: 'leave'}, ({key}) => {
        if (key && this.players.delete(key)) {
          this.emitRoster();
        }
      })
      .on('broadcast', {event: 'meta'}, ({payload}) => {
        if (payload && typeof payload === 'object') {
          this.handleIncomingMeta(payload as OnlinePlayerMeta);
        }
      })
      .on('broadcast', {event: 'pos'}, ({payload}) => {
        if (payload && typeof payload === 'object') {
          this.handleIncomingPose(payload as OnlinePlayerPosePacket);
        }
      })
      .on('broadcast', {event: 'gift'}, ({payload}) => {
        if (payload && typeof payload === 'object') {
          this.handleIncomingGift(payload as CoinGiftEvent);
        }
      })
      .on('broadcast', {event: 'req_meta'}, ({payload}) => {
        const p = payload as {targetId?: string} | null;
        if (p?.targetId === LOCAL_CLIENT_ID && this.localMeta) {
          void channel.send({type: 'broadcast', event: 'meta', payload: this.localMeta});
          if (this.lastPosePacket) {
            void channel.send({type: 'broadcast', event: 'pos', payload: this.lastPosePacket});
          }
        }
      })
      .subscribe(async (status) => {
        if (!this.started || this.supabaseChannel !== channel) return;
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected', 'supabase');
          if (this.localMeta) {
            try {
              await channel.track(this.localMeta);
              await channel.send({type: 'broadcast', event: 'meta', payload: this.localMeta});
            } catch {
              // ignore track hiccup
            }
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.setStatus('connecting', 'supabase');
        }
      });
  }

  private connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting', 'websocket');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws-multiplayer`;

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        if (!this.started || this.ws !== socket) return;
        this.setStatus('connected', 'websocket');
        if (this.localMeta) {
          socket.send(JSON.stringify({event: 'join', payload: this.localMeta}));
        }
      };

      socket.onmessage = (evt) => {
        if (!this.started) return;
        try {
          const msg = JSON.parse(String(evt.data)) as {event?: string; payload?: unknown};
          if (msg.event === 'roster' && Array.isArray(msg.payload)) {
            const nextIds = new Set<string>();
            for (const entry of msg.payload) {
              const m = entry as OnlinePlayerMeta;
              if (m && m.id && m.id !== LOCAL_CLIENT_ID) {
                nextIds.add(m.id);
                const prev = this.players.get(m.id);
                this.players.set(m.id, {
                  meta: m,
                  pose: prev?.pose ?? null,
                  lastSeenAt: Date.now(),
                });
              }
            }
            for (const id of Array.from(this.players.keys())) {
              if (!nextIds.has(id)) this.players.delete(id);
            }
            this.emitRoster();
          } else if (msg.event === 'meta' && msg.payload && typeof msg.payload === 'object') {
            this.handleIncomingMeta(msg.payload as OnlinePlayerMeta);
          } else if (msg.event === 'leave' && msg.payload && typeof msg.payload === 'object') {
            const p = msg.payload as {id?: string};
            if (p.id && this.players.delete(p.id)) {
              this.emitRoster();
            }
          } else if (msg.event === 'pos' && msg.payload && typeof msg.payload === 'object') {
            this.handleIncomingPose(msg.payload as OnlinePlayerPosePacket);
          } else if (msg.event === 'gift' && msg.payload && typeof msg.payload === 'object') {
            this.handleIncomingGift(msg.payload as CoinGiftEvent);
          } else if (msg.event === 'req_meta' && msg.payload && typeof msg.payload === 'object') {
            const p = msg.payload as {targetId?: string};
            if (p.targetId === LOCAL_CLIENT_ID && this.localMeta && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({event: 'meta', payload: this.localMeta}));
              if (this.lastPosePacket) {
                socket.send(JSON.stringify({event: 'pos', payload: this.lastPosePacket}));
              }
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        if (this.ws === socket) this.ws = null;
        if (!this.started) return;
        this.setStatus('connecting', 'websocket');
        if (this.wsReconnectTimer === null) {
          this.wsReconnectTimer = window.setTimeout(() => {
            this.wsReconnectTimer = null;
            if (this.started) this.connectWebSocket();
          }, 2200);
        }
      };

      socket.onerror = () => {
        // onclose handles reconnect
      };
    } catch {
      this.setStatus('disconnected', 'offline');
    }
  }

  private sendRawEvent(event: string, payload: unknown): void {
    if (this.supabaseChannel && this.status === 'connected') {
      void this.supabaseChannel.send({type: 'broadcast', event, payload});
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({event, payload}));
    }
  }

  public sendMeta(meta: OnlinePlayerMeta): void {
    const cleanMeta: OnlinePlayerMeta = {
      ...meta,
      id: LOCAL_CLIENT_ID,
      updatedAt: Date.now(),
    };
    this.localMeta = cleanMeta;
    if (this.supabaseChannel && this.status === 'connected') {
      void this.supabaseChannel.track(cleanMeta).catch(() => {});
      void this.supabaseChannel.send({type: 'broadcast', event: 'meta', payload: cleanMeta});
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({event: 'meta', payload: cleanMeta}));
    }
  }

  public sendPose(
    raw: Omit<OnlinePlayerPosePacket, 'id' | 'seq' | 't'>,
    forceImmediate = false,
  ): void {
    if (!this.started) return;
    if (!isPublicMultiplayerZone(raw.zone)) return;

    const now = performance.now();
    const zoneChanged = this.lastPoseZone !== raw.zone;
    const poseChanged = this.lastPoseKind !== raw.pose;
    const isMoving = Math.abs(raw.vx) > 0.02 || Math.abs(raw.vy) > 0.02 || Math.abs(raw.vz) > 0.02;
    const minInterval = isMoving ? 44 : 1100;

    if (!forceImmediate && !zoneChanged && !poseChanged && now - this.lastPoseSentAt < minInterval) {
      return;
    }

    this.lastPoseSentAt = now;
    this.lastPoseZone = raw.zone;
    this.lastPoseKind = raw.pose;
    this.poseSeq += 1;

    const q3 = (n: number) => Math.round(n * 1000) / 1000;
    const packet: OnlinePlayerPosePacket = {
      ...raw,
      id: LOCAL_CLIENT_ID,
      seq: this.poseSeq,
      t: Date.now(),
      x: q3(raw.x),
      y: q3(raw.y),
      z: q3(raw.z),
      vx: q3(raw.vx),
      vy: q3(raw.vy),
      vz: q3(raw.vz),
      rotY: q3(raw.rotY),
      rotX: q3(raw.rotX),
      poseProgress: q3(raw.poseProgress),
      speed: q3(raw.speed),
      boat: raw.boat
        ? {
            ...raw.boat,
            x: q3(raw.boat.x),
            z: q3(raw.boat.z),
            rotY: q3(raw.boat.rotY),
          }
        : null,
      pet: raw.pet
        ? {
            ...raw.pet,
            x: q3(raw.pet.x),
            y: q3(raw.pet.y),
            z: q3(raw.pet.z),
            rotY: q3(raw.pet.rotY),
          }
        : null,
    };

    this.lastPosePacket = packet;
    this.sendRawEvent('pos', packet);
  }

  public sendCoinGift(gift: Omit<CoinGiftEvent, 'txId' | 'fromPlayerId' | 'sentAt'>): CoinGiftEvent {
    const fullGift: CoinGiftEvent = {
      ...gift,
      txId: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fromPlayerId: LOCAL_CLIENT_ID,
      sentAt: Date.now(),
    };
    this.sendRawEvent('gift', fullGift);
    return fullGift;
  }
}

export const townMultiplayer = new TownMultiplayerClient();
