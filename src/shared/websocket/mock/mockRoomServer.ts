/**
 * In-memory room server for one room, speaking the Bruno room-socket contract.
 *
 * It keeps an authoritative `Room` and a hidden board, answers the client's commands
 * with the same acks, errors and events the Gateway sends, and exposes methods that
 * make other (simulated) players act. Every outbound frame is typed with the real
 * contract types from `@shared/types`; there is no second event model.
 *
 * Rules it applies are the contract's own: team before role, one Spymaster per team,
 * readiness reset on team/role change, the start predicate, host-only capacity changes
 * within `ROOM_CAPACITY`, host transfer by `joined_at`, and forfeit on leave `IN_GAME`.
 */

import { ROOM_CAPACITY } from '@shared/types';
import type {
  AckMessage,
  Card,
  CardColor,
  GameEndReason,
  GameTurnChangeReason,
  Room,
  RoomCommand,
  RoomMember,
  RoomRole,
  RoomServerEvent,
  Team,
  WsErrorCode,
  WsErrorMessage,
} from '@shared/types';

import type { MockEndpoint, MockServerBinding } from './mockTransport';

const WORDS = [
  'OCEAN',
  'ROBOT',
  'PIANO',
  'CASTLE',
  'EAGLE',
  'LASER',
  'MOON',
  'BRIDGE',
  'SHARK',
  'GLOVE',
  'TOWER',
  'COMET',
  'FOREST',
  'ENGINE',
  'CROWN',
  'MAPLE',
  'SPIDER',
  'VIOLIN',
  'DESERT',
  'ANCHOR',
  'PIRATE',
  'CANDLE',
  'GHOST',
  'NEEDLE',
  'WHALE',
];

export interface MockPlayer {
  user_id: number;
  username: string;
}

/** A rejected mock action, mirroring the WebSocket error envelope's `code`/`message`. */
export class MockActionError extends Error {
  readonly code: WsErrorCode | 'ROOM_FULL';
  readonly details: Record<string, unknown>;

  constructor(
    code: WsErrorCode | 'ROOM_FULL',
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'MockActionError';
    this.code = code;
    this.details = details;
  }
}

const other = (team: Team): Team => (team === 'RED' ? 'BLUE' : 'RED');
const now = (): string => new Date().toISOString();

export class MockRoomServer implements MockServerBinding {
  readonly roomId: number;
  /** The member whose browser the mock socket stands in for. */
  readonly self: MockPlayer;

  private room: Room;
  /** True colors of every card, never sent to an Operative for unrevealed cards. */
  private hiddenColors: CardColor[] = [];
  private eventSeq = 0;
  private readonly endpoints = new Set<MockEndpoint>();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(roomId: number, self: MockPlayer, maxPlayers: number = ROOM_CAPACITY.default) {
    this.roomId = roomId;
    this.self = self;
    const createdAt = now();
    this.room = {
      room_id: roomId,
      status: 'WAITING',
      host_user_id: self.user_id,
      player_count: 1,
      max_players: maxPlayers,
      startable: false,
      players: [this.newMember(self, true, createdAt)],
      game: null,
      created_at: createdAt,
    };
  }

  /* ------------------------------ transport side ---------------------------- */

  onOpen(endpoint: MockEndpoint): void {
    this.endpoints.add(endpoint);
    // The Gateway sends the authoritative snapshot on every (re)connect.
    endpoint.deliver(this.envelope('room.state', { room: this.projectRoom() }));
  }

  onClose(endpoint: MockEndpoint): void {
    this.endpoints.delete(endpoint);
  }

  onCommand(endpoint: MockEndpoint, raw: unknown): void {
    const command = raw as RoomCommand;
    try {
      const ackPayload = this.applyCommand(command);
      const ack: AckMessage = {
        type: 'ack',
        request_id: command.request_id,
        ok: true,
        payload: ackPayload,
      };
      endpoint.deliver(ack);
      this.flush();
    } catch (error) {
      this.pending = [];
      if (!(error instanceof MockActionError) || error.code === 'ROOM_FULL') throw error;
      const message: WsErrorMessage = {
        type: 'error',
        request_id: command.request_id,
        error: { code: error.code, message: error.message, details: error.details },
      };
      endpoint.deliver(message);
    }
  }

  /* ------------------------------ inspection -------------------------------- */

  /** Full authoritative room, including hidden card colors. For debugging only. */
  state(): Room {
    return structuredClone({
      ...this.room,
      game: this.room.game && { ...this.room.game, board: this.fullBoard() },
    });
  }

  /* ---------------------------- other players act --------------------------- */

  playerJoin(player: MockPlayer): Room {
    if (this.room.status !== 'WAITING') {
      throw new MockActionError(
        'INVALID_ROOM_STATE',
        `Room ${this.roomId} is not joinable while status is ${this.room.status}.`,
      );
    }
    if (this.room.player_count >= this.room.max_players) {
      throw new MockActionError(
        'ROOM_FULL',
        `Room ${this.roomId} is full (${this.room.player_count} of ${this.room.max_players} players).`,
        {
          room_id: this.roomId,
          player_count: this.room.player_count,
          max_players: this.room.max_players,
        },
      );
    }
    if (this.find(player.user_id))
      throw new MockActionError('INVALID_PAYLOAD', `User ${player.user_id} is already a member.`);
    const member = this.newMember(player, false, now());
    this.room.players.push(member);
    this.recount();
    this.queue('room.player.joined', this.membershipPayload(member));
    this.recheckStart(member.user_id);
    this.queueState();
    this.flush();
    return this.state();
  }

  /** Explicit leave. `IN_GAME` resolves to a `PLAYER_FORFEIT`, as REST Leave room does. */
  playerLeave(userId: number): Room {
    const member = this.require(userId);
    const wasInGame = this.room.status === 'IN_GAME';
    this.room.players = this.room.players.filter((p) => p.user_id !== userId);
    this.recount();
    if (this.room.host_user_id === userId) {
      const next = [...this.room.players].sort((a, b) => a.joined_at.localeCompare(b.joined_at))[0];
      this.room.host_user_id = next ? next.user_id : this.room.host_user_id;
      this.room.players.forEach((p) => (p.is_host = p.user_id === next?.user_id));
    }
    if (this.room.players.length === 0) this.room.status = 'CLOSED';
    if (wasInGame && member.team) {
      this.finish(other(member.team), 'PLAYER_FORFEIT', null, userId);
    } else {
      this.queue('room.player.left', this.membershipPayload(member));
      if (this.room.status === 'COUNTDOWN') this.cancelCountdown('PLAYER_LEFT', userId);
      this.recheckStart(userId);
      this.queueState();
    }
    this.flush();
    return this.state();
  }

  selectTeam(userId: number, team: Team): Room {
    this.doSelectTeam(userId, team);
    this.flush();
    return this.state();
  }

  selectRole(userId: number, role: RoomRole): Room {
    this.doSelectRole(userId, role);
    this.flush();
    return this.state();
  }

  setReady(userId: number, ready: boolean): Room {
    this.doSetReady(userId, ready);
    this.flush();
    return this.state();
  }

  updateSettings(maxPlayers: number, byUserId: number = this.room.host_user_id): Room {
    this.doUpdateSettings(byUserId, maxPlayers);
    this.flush();
    return this.state();
  }

  /**
   * Fill both teams with a valid start configuration and mark everyone ready, which
   * starts the countdown exactly as the server does. `selfRole` picks the local
   * player's seat on RED.
   */
  configureStartable(selfRole: RoomRole = 'OPERATIVE'): Room {
    const bots: MockPlayer[] = [
      { user_id: 9001, username: 'red_agent' },
      { user_id: 9002, username: 'blue_master' },
      { user_id: 9003, username: 'blue_agent' },
    ];
    for (const bot of bots) if (!this.find(bot.user_id)) this.playerJoin(bot);
    const seats: [number, Team, RoomRole][] = [
      [this.self.user_id, 'RED', selfRole],
      [9001, 'RED', selfRole === 'SPYMASTER' ? 'OPERATIVE' : 'SPYMASTER'],
      [9002, 'BLUE', 'SPYMASTER'],
      [9003, 'BLUE', 'OPERATIVE'],
    ];
    const seated = new Set(seats.map(([id]) => id));
    // Everyone else becomes an Operative so no Spymaster seat is contested.
    const extras = this.room.players.filter((p) => !seated.has(p.user_id));
    for (const p of extras) {
      if (p.role === 'SPYMASTER' || !p.role) {
        if (!p.team) this.doSelectTeam(p.user_id, 'RED');
        this.doSelectRole(p.user_id, 'OPERATIVE');
      }
    }
    for (const [id, team, role] of seats) {
      this.doSelectTeam(id, team);
      this.doSelectRole(id, role);
    }
    for (const p of [...extras, ...seats.map(([id]) => this.require(id))])
      this.doSetReady(p.user_id, true);
    this.flush();
    return this.state();
  }

  /** Skip the countdown and start immediately. */
  startGame(startingTeam: Team = 'RED'): Room {
    this.stopCountdownTimer();
    this.beginGame(startingTeam);
    this.flush();
    return this.state();
  }

  submitClue(word: string, number: number, byUserId?: number): Room {
    this.doSubmitClue(byUserId ?? this.spymasterOf(this.activeTeam()), word, number);
    this.flush();
    return this.state();
  }

  guessCard(cardId: number, byUserId?: number): Room {
    this.doGuess(byUserId ?? this.operativeOf(this.activeTeam()), cardId);
    this.flush();
    return this.state();
  }

  passTurn(byUserId?: number): Room {
    this.doPass(byUserId ?? this.operativeOf(this.activeTeam()));
    this.flush();
    return this.state();
  }

  endGame(winner: Team, reason: GameEndReason = 'ALL_TEAM_CARDS_REVEALED'): Room {
    this.requireGame();
    this.finish(winner, reason, null);
    this.flush();
    return this.state();
  }

  /** Drop every socket for this room; the client reconnects and receives a fresh snapshot. */
  dropConnection(reconnectAfterMs?: number): void {
    [...this.endpoints].forEach((endpoint) => endpoint.simulateDrop(reconnectAfterMs));
  }

  /** Send the current snapshot to every socket, as the server does after recovery. */
  resync(): void {
    this.queueState();
    this.flush();
  }

  /* ------------------------------ command handling -------------------------- */

  private applyCommand(command: RoomCommand): Record<string, unknown> {
    const id = this.self.user_id;
    if (!this.find(id))
      throw new MockActionError(
        'NOT_ROOM_MEMBER',
        `User ${id} is not a member of room ${this.roomId}.`,
        { room_id: this.roomId, user_id: id },
      );
    switch (command.type) {
      case 'room.settings.update':
        this.doUpdateSettings(id, command.payload.max_players);
        return { max_players: this.room.max_players, room_status: this.room.status };
      case 'room.team.select': {
        const m = this.doSelectTeam(id, command.payload.team);
        return {
          user_id: id,
          team: m.team,
          role: m.role,
          ready: m.ready,
          room_status: this.room.status,
        };
      }
      case 'room.role.select': {
        const m = this.doSelectRole(id, command.payload.role);
        return {
          user_id: id,
          team: m.team,
          role: m.role,
          ready: m.ready,
          room_status: this.room.status,
        };
      }
      case 'room.ready.set': {
        const m = this.doSetReady(id, command.payload.ready);
        return {
          user_id: id,
          ready: m.ready,
          room_status: this.room.status,
          startable: this.room.startable,
        };
      }
      case 'game.clue.submit':
        this.doSubmitClue(id, command.payload.word, command.payload.number);
        return {
          game_id: this.requireGame().game_id,
          current_turn: this.requireGame().current_turn,
        };
      case 'game.card.guess':
        this.doGuess(id, command.payload.card_id);
        return { game_id: this.requireGame().game_id, card_id: command.payload.card_id };
      case 'game.turn.pass':
        this.doPass(id);
        return {
          game_id: this.requireGame().game_id,
          current_turn: this.requireGame().current_turn,
        };
      default:
        throw new MockActionError('INVALID_EVENT', 'Message type is not supported.');
    }
  }

  private doUpdateSettings(byUserId: number, maxPlayers: number): void {
    this.require(byUserId);
    if (byUserId !== this.room.host_user_id) {
      throw new MockActionError('NOT_HOST', 'Only the host can change room settings.', {
        host_user_id: this.room.host_user_id,
      });
    }
    if (this.room.status !== 'WAITING') this.invalidState();
    const min = Math.max(ROOM_CAPACITY.min, this.room.player_count);
    if (!Number.isInteger(maxPlayers) || maxPlayers < min || maxPlayers > ROOM_CAPACITY.max) {
      throw new MockActionError(
        'INVALID_PAYLOAD',
        `payload.max_players must be an integer from ${min} through ${ROOM_CAPACITY.max}.`,
        {
          field: 'payload.max_players',
          min,
          max: ROOM_CAPACITY.max,
        },
      );
    }
    this.room.max_players = maxPlayers;
    this.queue('room.settings.updated', {
      max_players: maxPlayers,
      player_count: this.room.player_count,
      changed_by_user_id: byUserId,
    });
    this.queueState();
  }

  private doSelectTeam(userId: number, team: Team): RoomMember {
    const member = this.require(userId);
    this.requireLobby();
    const roleConflict = member.role === 'SPYMASTER' && this.spymasterOf(team, false) !== undefined;
    member.team = team;
    if (roleConflict) member.role = null;
    return this.memberChanged(
      member,
      ['team', ...(roleConflict ? (['role'] as const) : [])],
      'TEAM_CHANGED',
    );
  }

  private doSelectRole(userId: number, role: RoomRole): RoomMember {
    const member = this.require(userId);
    this.requireLobby();
    if (!member.team)
      throw new MockActionError('TEAM_REQUIRED', 'Select a team before selecting a role.', {
        user_id: userId,
      });
    if (role === 'SPYMASTER') {
      const holder = this.room.players.find(
        (p) => p.team === member.team && p.role === 'SPYMASTER' && p.user_id !== userId,
      );
      if (holder) {
        throw new MockActionError('ROLE_CONFLICT', `${member.team} already has a Spymaster.`, {
          team: member.team,
          occupied_by_user_id: holder.user_id,
        });
      }
    }
    member.role = role;
    return this.memberChanged(member, ['role'], 'ROLE_CHANGED');
  }

  private doSetReady(userId: number, ready: boolean): RoomMember {
    const member = this.require(userId);
    this.requireLobby();
    if (ready && !member.team)
      throw new MockActionError('TEAM_REQUIRED', 'Select a team before becoming ready.', {
        user_id: userId,
      });
    if (ready && !member.role)
      throw new MockActionError('ROLE_REQUIRED', 'Select a role before becoming ready.', {
        user_id: userId,
      });
    member.ready = ready;
    const cancelling = this.room.status === 'COUNTDOWN' && !ready;
    this.queue('room.player.updated', {
      player: { ...member },
      changed_fields: ['ready'],
      room_status: this.room.status,
      startable: this.computeStartable(),
    });
    if (cancelling) this.cancelCountdown('PLAYER_UNREADY', userId);
    this.recheckStart(userId);
    this.queueState();
    return member;
  }

  private memberChanged(
    member: RoomMember,
    fields: ('team' | 'role')[],
    reason: 'TEAM_CHANGED' | 'ROLE_CHANGED',
  ): RoomMember {
    const readyChanged = member.ready;
    member.ready = false;
    const changed = readyChanged ? [...fields, 'ready' as const] : fields;
    this.queue('room.player.updated', {
      player: { ...member },
      changed_fields: changed,
      room_status: this.room.status,
      startable: this.computeStartable(),
    });
    if (this.room.status === 'COUNTDOWN') this.cancelCountdown(reason, member.user_id);
    this.recheckStart(member.user_id);
    this.queueState();
    return member;
  }

  /* --------------------------------- countdown ------------------------------ */

  private recheckStart(changedBy: number): void {
    const startable = this.computeStartable();
    this.room.startable = startable;
    if (this.room.status === 'WAITING' && startable) {
      this.room.status = 'COUNTDOWN';
      this.room.countdown = { seconds_remaining: 3 };
      this.queue('room.countdown.started', { seconds_remaining: 3 });
      this.startCountdownTimer();
    } else if (this.room.status === 'COUNTDOWN' && !startable) {
      this.cancelCountdown('PLAYER_UNREADY', changedBy);
    }
  }

  private cancelCountdown(
    reason: 'PLAYER_UNREADY' | 'PLAYER_LEFT' | 'TEAM_CHANGED' | 'ROLE_CHANGED',
    by: number,
  ): void {
    if (this.room.status !== 'COUNTDOWN') return;
    this.stopCountdownTimer();
    this.room.status = 'WAITING';
    delete this.room.countdown;
    this.queue('room.countdown.cancelled', { reason, changed_by_user_id: by });
  }

  private startCountdownTimer(): void {
    this.stopCountdownTimer();
    this.countdownTimer = setInterval(() => {
      const left = (this.room.countdown?.seconds_remaining ?? 1) - 1;
      if (left > 0) {
        this.room.countdown = { seconds_remaining: left };
        this.queue('room.countdown.tick', { seconds_remaining: left });
      } else {
        this.stopCountdownTimer();
        this.beginGame(Math.random() < 0.5 ? 'RED' : 'BLUE');
      }
      this.flush();
    }, 1_000);
  }

  private stopCountdownTimer(): void {
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  /* ----------------------------------- game --------------------------------- */

  private beginGame(startingTeam: Team): void {
    const colors: CardColor[] = [
      ...Array<CardColor>(9).fill(startingTeam),
      ...Array<CardColor>(8).fill(other(startingTeam)),
      ...Array<CardColor>(7).fill('NEUTRAL'),
      'ASSASSIN',
    ];
    this.hiddenColors = colors.sort(() => Math.random() - 0.5);
    this.room.status = 'IN_GAME';
    delete this.room.countdown;
    this.room.players.forEach((p) => (p.ready = false));
    this.room.game = {
      game_id: this.roomId * 10 + 1,
      starting_team: startingTeam,
      current_turn: {
        team: startingTeam,
        phase: 'WAITING_FOR_CLUE',
        clue: null,
        guesses_remaining: null,
      },
      score: { red: 0, blue: 0 },
      board: WORDS.map((word, i) => ({ card_id: i + 1, word, revealed: false, color: null })),
      winner: null,
      end_reason: null,
      started_at: now(),
      finished_at: null,
    };
    this.queue('game.started', { room: this.projectRoom() });
  }

  private doSubmitClue(userId: number, word: string, number: number): void {
    const game = this.requireGame();
    const member = this.require(userId);
    if (game.current_turn.team !== member.team)
      throw new MockActionError(
        'NOT_YOUR_TURN',
        `${member.team} cannot give a clue while ${game.current_turn.team} is the active team.`,
        { active_team: game.current_turn.team },
      );
    if (member.role !== 'SPYMASTER')
      throw new MockActionError(
        'ROLE_FORBIDDEN',
        'Only the active-team Spymaster may submit a clue.',
        { required_role: 'SPYMASTER' },
      );
    if (game.current_turn.phase !== 'WAITING_FOR_CLUE') this.invalidState();
    const clue = word.trim().toLowerCase();
    if (!/^\S{1,30}$/u.test(clue))
      throw new MockActionError(
        'INVALID_CLUE',
        'payload.word must contain exactly one non-whitespace word.',
        { field: 'payload.word' },
      );
    if (!Number.isInteger(number) || number < 1 || number > 9)
      throw new MockActionError(
        'INVALID_CLUE_NUMBER',
        'payload.number must be an integer from 1 through 9.',
        { field: 'payload.number', min: 1, max: 9 },
      );
    game.current_turn = {
      team: game.current_turn.team,
      phase: 'GUESSING',
      clue: { word: clue, number },
      guesses_remaining: number + 1,
    };
    this.queue('game.clue.submitted', {
      game_id: game.game_id,
      submitted_by_user_id: userId,
      team: game.current_turn.team,
      clue: { word: clue, number },
      guesses_remaining: number + 1,
      current_turn: { ...game.current_turn },
    });
  }

  private doGuess(userId: number, cardId: number): void {
    const game = this.requireGame();
    const member = this.require(userId);
    this.requireGuesser(member);
    const card = game.board.find((c) => c.card_id === cardId);
    if (!card)
      throw new MockActionError(
        'INVALID_CARD',
        `Card ${cardId} does not exist in game ${game.game_id}.`,
        { card_id: cardId, game_id: game.game_id },
      );
    if (card.revealed)
      throw new MockActionError(
        'CARD_ALREADY_REVEALED',
        `Card ${cardId} has already been revealed.`,
        { card_id: cardId },
      );

    const color = this.hiddenColors[cardId - 1] as CardColor;
    const team = game.current_turn.team;
    card.revealed = true;
    card.color = color;
    if (color === 'RED') game.score.red += 1;
    if (color === 'BLUE') game.score.blue += 1;
    game.current_turn.guesses_remaining = (game.current_turn.guesses_remaining ?? 1) - 1;

    const redTotal = this.hiddenColors.filter((c) => c === 'RED').length;
    const blueTotal = this.hiddenColors.filter((c) => c === 'BLUE').length;
    let winner: Team | null = null;
    let reason: GameEndReason | null = null;
    if (color === 'ASSASSIN') [winner, reason] = [other(team), 'ASSASSIN_REVEALED'];
    else if (game.score.red === redTotal) [winner, reason] = ['RED', 'ALL_TEAM_CARDS_REVEALED'];
    else if (game.score.blue === blueTotal) [winner, reason] = ['BLUE', 'ALL_TEAM_CARDS_REVEALED'];

    const revealed = { card_id: cardId, word: card.word, revealed: true as const, color };
    this.queue('game.card.revealed', {
      game_id: game.game_id,
      card: revealed,
      guessed_by_user_id: userId,
      guessing_team: team,
      score: { ...game.score },
      current_turn: { ...game.current_turn },
      winner,
      end_reason: reason,
    });
    if (color === 'RED' || color === 'BLUE')
      this.queue('game.score.updated', {
        game_id: game.game_id,
        score: { ...game.score },
        changed_color: color,
      });

    if (winner && reason) {
      this.finish(winner, reason, revealed);
      return;
    }
    if (color === 'NEUTRAL') this.changeTurn('NEUTRAL_CARD_REVEALED');
    else if (color !== team) this.changeTurn('OPPONENT_CARD_REVEALED');
    else if (game.current_turn.guesses_remaining === 0) this.changeTurn('GUESSES_EXHAUSTED');
  }

  private doPass(userId: number): void {
    this.requireGuesser(this.require(userId));
    this.changeTurn('PASSED');
  }

  private changeTurn(reason: GameTurnChangeReason): void {
    const game = this.requireGame();
    const previous = game.current_turn.team;
    game.current_turn = {
      team: other(previous),
      phase: 'WAITING_FOR_CLUE',
      clue: null,
      guesses_remaining: null,
    };
    this.queue('game.turn.changed', {
      game_id: game.game_id,
      previous_team: previous,
      reason,
      current_turn: { ...game.current_turn },
      score: { ...game.score },
    });
  }

  private finish(
    winner: Team,
    reason: GameEndReason,
    revealed: Card | null,
    abandonedBy?: number,
  ): void {
    const game = this.requireGame();
    const finishedAt = now();
    game.winner = winner;
    game.end_reason = reason;
    game.finished_at = finishedAt;
    game.current_turn = { ...game.current_turn, phase: 'GAME_OVER' };
    if (this.room.status !== 'CLOSED') this.room.status = 'FINISHED';
    this.queue('game.ended', {
      game_id: game.game_id,
      winner,
      loser: other(winner),
      end_reason: reason,
      ...(abandonedBy === undefined ? {} : { abandoned_by_user_id: abandonedBy }),
      revealed_card: revealed && {
        card_id: revealed.card_id,
        word: revealed.word,
        revealed: true,
        color: revealed.color as CardColor,
      },
      score: { ...game.score },
      room_status: 'FINISHED',
      phase: 'GAME_OVER',
      finished_at: finishedAt,
    });
  }

  /* --------------------------------- helpers -------------------------------- */

  private pending: { type: RoomServerEvent['type']; payload: unknown }[] = [];

  private queue<T extends RoomServerEvent>(type: T['type'], payload: T['payload']): void {
    this.pending.push({ type, payload });
  }

  private queueState(): void {
    this.pending.push({ type: 'room.state', payload: null });
  }

  /** Emit queued events in order; snapshots are projected at emission time. */
  private flush(): void {
    const batch = this.pending;
    this.pending = [];
    for (const item of batch) {
      const payload =
        item.type === 'room.state' || item.type === 'game.started'
          ? { room: this.projectRoom() }
          : item.payload;
      const event = this.envelope(item.type, payload);
      this.endpoints.forEach((endpoint) => endpoint.deliver(event));
    }
  }

  private envelope(type: string, payload: unknown): RoomServerEvent {
    this.eventSeq += 1;
    return {
      type,
      event_id: `evt_${String(this.eventSeq).padStart(8, '0')}`,
      room_id: this.roomId,
      sent_at: now(),
      payload,
    } as RoomServerEvent;
  }

  /** Role-safe projection for `self`: an Operative never sees unrevealed colors. */
  private projectRoom(): Room {
    const room = structuredClone(this.room);
    if (room.game) {
      const spymaster = this.find(this.self.user_id)?.role === 'SPYMASTER';
      room.game.board = room.game.board.map((card, i) => ({
        ...card,
        color: card.revealed || spymaster ? (this.hiddenColors[i] as CardColor) : null,
      }));
    }
    return room;
  }

  private fullBoard(): Card[] {
    return (this.room.game?.board ?? []).map((card, i) => ({
      ...card,
      color: this.hiddenColors[i] as CardColor,
    }));
  }

  private computeStartable(): boolean {
    const p = this.room.players;
    if (p.length < ROOM_CAPACITY.min || p.some((m) => !m.team || !m.role || !m.ready)) return false;
    return (['RED', 'BLUE'] as Team[]).every(
      (team) =>
        p.filter((m) => m.team === team && m.role === 'SPYMASTER').length === 1 &&
        p.some((m) => m.team === team && m.role === 'OPERATIVE'),
    );
  }

  private membershipPayload(member: RoomMember) {
    return {
      player: { ...member },
      host_user_id: this.room.players.length ? this.room.host_user_id : null,
      player_count: this.room.player_count,
      room_status: this.room.status,
    };
  }

  private newMember(player: MockPlayer, isHost: boolean, joinedAt: string): RoomMember {
    return {
      user_id: player.user_id,
      username: player.username,
      team: null,
      role: null,
      ready: false,
      is_host: isHost,
      joined_at: joinedAt,
    };
  }

  private recount(): void {
    this.room.player_count = this.room.players.length;
  }

  private find(userId: number): RoomMember | undefined {
    return this.room.players.find((p) => p.user_id === userId);
  }

  private require(userId: number): RoomMember {
    const member = this.find(userId);
    if (!member)
      throw new MockActionError(
        'NOT_ROOM_MEMBER',
        `User ${userId} is not a member of room ${this.roomId}.`,
        { room_id: this.roomId, user_id: userId },
      );
    return member;
  }

  private requireLobby(): void {
    if (this.room.status !== 'WAITING' && this.room.status !== 'COUNTDOWN') this.invalidState();
  }

  private requireGame() {
    const game = this.room.game;
    if (!game || this.room.status === 'WAITING' || this.room.status === 'COUNTDOWN')
      this.invalidState();
    if (game!.winner)
      throw new MockActionError(
        'GAME_ALREADY_FINISHED',
        `Game ${game!.game_id} has already finished.`,
        { game_id: game!.game_id, winner: game!.winner },
      );
    return game!;
  }

  private requireGuesser(member: RoomMember): void {
    const game = this.requireGame();
    if (game.current_turn.team !== member.team)
      throw new MockActionError(
        'NOT_YOUR_TURN',
        `${member.team} cannot guess while ${game.current_turn.team} is the active team.`,
        { active_team: game.current_turn.team },
      );
    if (member.role !== 'OPERATIVE')
      throw new MockActionError(
        'ROLE_FORBIDDEN',
        'Only an active-team Operative may guess a card.',
        { required_role: 'OPERATIVE' },
      );
    if (game.current_turn.phase !== 'GUESSING') this.invalidState();
  }

  private activeTeam(): Team {
    return this.requireGame().current_turn.team;
  }

  private spymasterOf(team: Team, required = true): number {
    const id = this.room.players.find((p) => p.team === team && p.role === 'SPYMASTER')?.user_id;
    if (id === undefined && required)
      throw new MockActionError('ROLE_FORBIDDEN', `${team} has no Spymaster.`);
    return id as number;
  }

  private operativeOf(team: Team): number {
    const id = this.room.players.find((p) => p.team === team && p.role === 'OPERATIVE')?.user_id;
    if (id === undefined) throw new MockActionError('ROLE_FORBIDDEN', `${team} has no Operative.`);
    return id;
  }

  private invalidState(): never {
    throw new MockActionError(
      'INVALID_ROOM_STATE',
      `This action is not allowed while room status is ${this.room.status}.`,
      { status: this.room.status },
    );
  }
}
