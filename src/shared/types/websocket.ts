/**
 * WebSocket envelopes, commands and events, from Bruno `websocket/opencollection.yml`
 * (Envelopes and ordering) and the per-folder message contracts.
 *
 * Both sockets authenticate by the HttpOnly `ft_session` cookie attached automatically
 * on a same-origin upgrade. Nothing here carries a credential, by design.
 */

import type { ChatMessageNewPayload, ChatSendAck, ChatSendPayload } from './chat';
import type { Score, Team } from './common';
import type { CardColor, Clue, CurrentTurn, GameEndReason } from './game';
import type { Room, RoomMember, RoomRole, RoomStatus } from './room';

/* -------------------------------------------------------------------------- */
/* Client to server                                                            */
/* -------------------------------------------------------------------------- */

export type RoomCommandType =
  | 'room.team.select'
  | 'room.role.select'
  | 'room.ready.set'
  | 'game.clue.submit'
  | 'game.card.guess'
  | 'game.turn.pass';

export type ChatCommandType = 'chat.message.send';

/**
 * Client envelope. `request_id` is a client-generated unique string of 1..64 visible
 * ASCII characters; the server caches its result per session for the room lifetime,
 * so an identical retry replays the original ack rather than repeating the mutation.
 */
export interface ClientEnvelope<TType extends string, TPayload> {
  type: TType;
  request_id: string;
  payload: TPayload;
}

export type SelectTeamCommand = ClientEnvelope<'room.team.select', { team: Team }>;
export type SelectRoleCommand = ClientEnvelope<'room.role.select', { role: RoomRole }>;
export type SetReadyCommand = ClientEnvelope<'room.ready.set', { ready: boolean }>;
export type SubmitClueCommand = ClientEnvelope<
  'game.clue.submit',
  { word: string; number: number }
>;
export type GuessCardCommand = ClientEnvelope<'game.card.guess', { card_id: number }>;
export type PassTurnCommand = ClientEnvelope<'game.turn.pass', Record<string, never>>;

export type RoomCommand =
  | SelectTeamCommand
  | SelectRoleCommand
  | SetReadyCommand
  | SubmitClueCommand
  | GuessCardCommand
  | PassTurnCommand;

export type ChatCommand = ClientEnvelope<'chat.message.send', ChatSendPayload>;

/* -------------------------------------------------------------------------- */
/* Server to client                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Room-stream event envelope. `event_id` is unique and monotonically ordered within
 * one room stream; a detected gap is recovered by taking a fresh `room.state`
 * snapshot, never by replaying history.
 */
export interface ServerEventEnvelope<TType extends string, TPayload> {
  type: TType;
  event_id: string;
  room_id: number;
  sent_at: string;
  payload: TPayload;
}

/**
 * An `ack` is not a room event: it omits `event_id`, `room_id` and `sent_at`. It
 * confirms the command was accepted — the paired server event carries the same
 * authoritative values, so applying both would double-apply the change.
 */
export interface AckMessage<TPayload = Record<string, unknown>> {
  type: 'ack';
  request_id: string;
  ok: true;
  payload: TPayload;
}

export type WsErrorCode =
  | 'INVALID_EVENT'
  | 'INVALID_PAYLOAD'
  | 'UNAUTHORIZED'
  | 'ROOM_NOT_FOUND'
  | 'NOT_ROOM_MEMBER'
  | 'INVALID_ROOM_STATE'
  | 'TEAM_REQUIRED'
  | 'ROLE_REQUIRED'
  | 'ROLE_CONFLICT'
  | 'NOT_YOUR_TURN'
  | 'ROLE_FORBIDDEN'
  | 'INVALID_CLUE'
  | 'INVALID_CLUE_NUMBER'
  | 'INVALID_CARD'
  | 'CARD_ALREADY_REVEALED'
  | 'NO_GUESSES_REMAINING'
  | 'GAME_ALREADY_FINISHED'
  | 'NOT_PERMITTED'
  | 'USER_NOT_FOUND';

/** Action errors keep the connection open and never mutate room/game state. */
export interface WsErrorMessage {
  type: 'error';
  /** `null` when the request ID was absent or unparseable. */
  request_id: string | null;
  error: {
    code: WsErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
}

/* ----------------------------- room events -------------------------------- */

export type RoomMemberChangedField = 'team' | 'role' | 'ready';

export type CountdownCancelReason =
  'PLAYER_UNREADY' | 'PLAYER_LEFT' | 'TEAM_CHANGED' | 'ROLE_CHANGED';

export type RoomStateEvent = ServerEventEnvelope<'room.state', { room: Room }>;

export interface RoomMembershipPayload {
  player: RoomMember;
  /** `null` only when the room closes empty. */
  host_user_id: number | null;
  player_count: number;
  room_status: RoomStatus;
}

export type RoomPlayerJoinedEvent = ServerEventEnvelope<
  'room.player.joined',
  RoomMembershipPayload
>;
export type RoomPlayerLeftEvent = ServerEventEnvelope<'room.player.left', RoomMembershipPayload>;

export type RoomPlayerUpdatedEvent = ServerEventEnvelope<
  'room.player.updated',
  {
    player: RoomMember;
    changed_fields: RoomMemberChangedField[];
    room_status: RoomStatus;
    startable: boolean;
  }
>;

export type RoomCountdownStartedEvent = ServerEventEnvelope<
  'room.countdown.started',
  { seconds_remaining: number }
>;
export type RoomCountdownTickEvent = ServerEventEnvelope<
  'room.countdown.tick',
  { seconds_remaining: number }
>;
export type RoomCountdownCancelledEvent = ServerEventEnvelope<
  'room.countdown.cancelled',
  { reason: CountdownCancelReason; changed_by_user_id: number }
>;

/* ----------------------------- game events -------------------------------- */

export type GameStartedEvent = ServerEventEnvelope<'game.started', { room: Room }>;

/**
 * The Game Session-internal shape reused inside `room.state.payload.room.game`. It is
 * not a separate recovery path a client requests on its own — `room.state` is the one
 * canonical reconnect snapshot.
 */
export type GameStateEvent = ServerEventEnvelope<'game.state', { room: Room }>;

export type GameClueSubmittedEvent = ServerEventEnvelope<
  'game.clue.submitted',
  {
    game_id: number;
    submitted_by_user_id: number;
    team: Team;
    clue: Clue;
    guesses_remaining: number;
    current_turn: CurrentTurn;
  }
>;

export type GameCardRevealedEvent = ServerEventEnvelope<
  'game.card.revealed',
  {
    game_id: number;
    /** A revealed card's color is public, so it is never `null` here. */
    card: { card_id: number; word: string; revealed: true; color: CardColor };
    guessed_by_user_id: number;
    guessing_team: Team;
    score: Score;
    current_turn: CurrentTurn;
    winner: Team | null;
    end_reason: GameEndReason | null;
  }
>;

export type GameScoreUpdatedEvent = ServerEventEnvelope<
  'game.score.updated',
  { game_id: number; score: Score; changed_color: Team }
>;

export type GameTurnChangeReason =
  'PASSED' | 'NEUTRAL_CARD_REVEALED' | 'OPPONENT_CARD_REVEALED' | 'GUESSES_EXHAUSTED';

export type GameTurnChangedEvent = ServerEventEnvelope<
  'game.turn.changed',
  {
    game_id: number;
    previous_team: Team;
    reason: GameTurnChangeReason;
    current_turn: CurrentTurn;
    score: Score;
  }
>;

/** Terminal for the match. No `game.turn.changed` follows it. */
export type GameEndedEvent = ServerEventEnvelope<
  'game.ended',
  {
    game_id: number;
    winner: Team;
    loser: Team;
    end_reason: GameEndReason;
    /** Present for `PLAYER_FORFEIT`. */
    abandoned_by_user_id?: number;
    /** `null` for `PLAYER_FORFEIT` — no card triggered it. */
    revealed_card: { card_id: number; word: string; revealed: true; color: CardColor } | null;
    score: Score;
    room_status: 'FINISHED';
    phase: 'GAME_OVER';
    finished_at: string;
  }
>;

export type RoomServerEvent =
  | RoomStateEvent
  | RoomPlayerJoinedEvent
  | RoomPlayerLeftEvent
  | RoomPlayerUpdatedEvent
  | RoomCountdownStartedEvent
  | RoomCountdownTickEvent
  | RoomCountdownCancelledEvent
  | GameStartedEvent
  | GameStateEvent
  | GameClueSubmittedEvent
  | GameCardRevealedEvent
  | GameScoreUpdatedEvent
  | GameTurnChangedEvent
  | GameEndedEvent;

/** Anything the room socket can deliver. */
export type RoomServerMessage = RoomServerEvent | AckMessage | WsErrorMessage;

/* ----------------------------- chat messages ------------------------------ */

/** The chat envelope has no `room_id` — the chat socket is not room-scoped. */
export interface ChatEventEnvelope<TType extends string, TPayload> {
  type: TType;
  event_id: string;
  sent_at: string;
  payload: TPayload;
}

export type ChatMessageNewEvent = ChatEventEnvelope<'chat.message.new', ChatMessageNewPayload>;

export type ChatServerMessage = ChatMessageNewEvent | AckMessage<ChatSendAck> | WsErrorMessage;

/**
 * Close codes the Gateway uses. `4401` means the session became explicitly invalid
 * after connection (logout, refresh-token-family revocation) — ordinary access-token
 * expiry does not by itself close an open socket.
 */
export const WS_CLOSE_UNAUTHORIZED = 4401;
export const WS_CLOSE_ROOM_NOT_FOUND = 4404;
export const WS_CLOSE_NOT_ROOM_MEMBER = 4403;
