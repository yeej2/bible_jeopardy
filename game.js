import { defaultRounds } from './questions.js';

const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function createDailyDoubles(round) {
  const dd = [];
  const categories = round.categories;
  const catCount = categories.length;
  const clueCount = categories[0].clues.length;

  // First round: 1 daily double. Second round: 2 daily doubles.
  const count = 1;
  const used = new Set();
  while (dd.length < count) {
    const c = Math.floor(Math.random() * catCount);
    const r = Math.floor(Math.random() * clueCount);
    const key = `${c}-${r}`;
    if (!used.has(key)) {
      used.add(key);
      dd.push({ categoryIndex: c, clueIndex: r });
    }
  }
  return dd;
}

function createBoard(round, dailyDoubles) {
  const ddSet = new Set(dailyDoubles.map((d) => `${d.categoryIndex}-${d.clueIndex}`));
  return {
    categories: round.categories.map((cat, cIdx) => ({
      name: cat.name,
      clues: cat.clues.map((clue, rIdx) => ({
        value: clue.value,
        question: clue.question,
        answer: clue.answer,
        answered: false,
        isDailyDouble: ddSet.has(`${cIdx}-${rIdx}`),
        categoryIndex: cIdx,
        clueIndex: rIdx,
      }))
    }))
  };
}

export function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  const hostId = `host-${hostSocketId}`;
  const room = {
    code,
    phase: 'lobby',
    players: new Map(),
    teams: new Map(),
    hostId,
    board: null,
    currentRoundIndex: 0,
    currentClue: null,
    activeTeamId: null,
    buzzOrder: [],
    attemptedTeams: new Set(),
    dailyDoubles: [],
    finalWagers: {},
    finalAnswers: {},
    timerEnd: null,
    rounds: defaultRounds,
    selectedByTeamId: null,
    finalRevealed: false,
  };
  rooms.set(code, room);
  return { room, hostId };
}

export function getRoom(code) {
  return rooms.get(code);
}

export function getAllRooms() {
  return rooms;
}

export function removeRoom(code) {
  rooms.delete(code);
}

export function addPlayer(room, socketId, name, isHost = false) {
  const id = isHost ? room.hostId : `p-${socketId}`;
  room.players.set(id, {
    id,
    socketId,
    name: name || (isHost ? 'Host' : 'Player'),
    teamId: null,
    isHost,
  });
  return id;
}

export function removePlayer(room, socketId) {
  for (const [id, player] of room.players.entries()) {
    if (player.socketId === socketId) {
      if (player.teamId) {
        const team = room.teams.get(player.teamId);
        if (team) {
          team.members = team.members.filter((m) => m !== id);
        }
      }
      room.players.delete(id);
      return id;
    }
  }
  return null;
}

export function createTeam(room, name) {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  room.teams.set(id, { id, name: name || `Team ${room.teams.size + 1}`, score: 0, members: [] });
  return id;
}

export function joinTeam(room, playerId, teamId) {
  const player = room.players.get(playerId);
  if (!player || !room.teams.has(teamId)) return false;
  // Remove from old team
  if (player.teamId && room.teams.has(player.teamId)) {
    const old = room.teams.get(player.teamId);
    old.members = old.members.filter((m) => m !== playerId);
  }
  player.teamId = teamId;
  room.teams.get(teamId).members.push(playerId);
  return true;
}

export function startGame(room) {
  if (room.teams.size < 1) return false;
  room.currentRoundIndex = 0;
  room.dailyDoubles = createDailyDoubles(room.rounds[0]);
  room.board = createBoard(room.rounds[0], room.dailyDoubles);
  room.phase = 'board';
  room.activeTeamId = Array.from(room.teams.keys())[0];
  room.currentClue = null;
  room.buzzOrder = [];
  room.attemptedTeams = new Set();
  room.finalWagers = {};
  room.finalAnswers = {};
  room.timerEnd = null;
  room.selectedByTeamId = null;
  room.finalRevealed = false;
  return true;
}

export function selectClue(room, teamId, categoryIndex, clueIndex) {
  if (room.phase !== 'board') return false;
  if (room.activeTeamId !== teamId) return false;
  const clue = room.board.categories[categoryIndex]?.clues[clueIndex];
  if (!clue || clue.answered) return false;

  clue.answered = true;
  room.currentClue = { ...clue };
  room.selectedByTeamId = teamId;
  room.buzzOrder = [];
  room.attemptedTeams = new Set();

  if (clue.isDailyDouble) {
    room.phase = 'dailydouble';
    room.activeTeamId = teamId;
  } else {
    room.phase = 'clue';
    // Start a short reading period then open buzzes
    room.timerEnd = Date.now() + 4000;
  }
  return true;
}

export function buzz(room, playerId) {
  if (room.phase !== 'clue') return false;
  const player = room.players.get(playerId);
  if (!player || !player.teamId) return false;
  if (room.buzzOrder.includes(player.teamId)) return false;
  if (room.attemptedTeams.has(player.teamId)) return false;

  // Only allow buzz after reading period
  if (room.timerEnd && Date.now() < room.timerEnd) return false;

  room.buzzOrder.push(player.teamId);
  if (room.buzzOrder.length === 1) {
    room.activeTeamId = player.teamId;
    room.phase = 'answering';
    room.timerEnd = Date.now() + 10000; // 10s to answer
  }
  return true;
}

export function submitAnswer(room, teamId, answer) {
  if (room.phase !== 'answering' && room.phase !== 'dailydouble' && room.phase !== 'final') return false;
  if (room.phase === 'dailydouble' && room.activeTeamId !== teamId) return false;
  if (room.phase === 'final') {
    room.finalAnswers[teamId] = answer;
    return true;
  }
  room.currentClue.submittedAnswer = answer;
  room.currentClue.answeringTeamId = teamId;
  room.phase = 'judging';
  return true;
}

export function judgeAnswer(room, correct) {
  if (room.phase !== 'judging' && room.phase !== 'dailydouble' && room.phase !== 'final') return false;
  const clue = room.currentClue;
  const teamId = room.phase === 'dailydouble' ? room.activeTeamId : clue.answeringTeamId;
  const team = room.teams.get(teamId);
  const value = clue.wager || clue.value;

  if (correct) {
    team.score += value;
    room.activeTeamId = teamId;
    room.attemptedTeams = new Set();
    room.buzzOrder = [];
    room.currentClue = null;
    room.phase = 'board';
    checkRoundComplete(room);
    return true;
  }

  team.score -= value;
  room.attemptedTeams.add(teamId);

  if (room.phase === 'dailydouble') {
    room.currentClue = null;
    room.phase = 'board';
    checkRoundComplete(room);
    return true;
  }

  // Reopen buzz to other teams not yet attempted
  const remaining = Array.from(room.teams.keys()).filter(
    (t) => !room.attemptedTeams.has(t) && !room.buzzOrder.includes(t)
  );
  if (remaining.length > 0) {
    room.activeTeamId = null;
    room.phase = 'clue';
    room.timerEnd = null;
  } else {
    // All missed it
    room.activeTeamId = room.selectedByTeamId;
    room.currentClue = null;
    room.phase = 'board';
    checkRoundComplete(room);
  }
  return true;
}

export function submitWager(room, teamId, amount) {
  if (room.phase === 'dailydouble') {
    const team = room.teams.get(teamId);
    const maxClueValue = Math.max(...room.board.categories.flatMap((c) => c.clues.map((cl) => cl.value)));
    const maxWager = Math.max(team.score, maxClueValue);
    const wager = Math.max(0, Math.min(amount, maxWager));
    room.currentClue.wager = wager;
    room.phase = 'dailydouble';
    // Move to answering after a moment handled by client/host
    return true;
  }
  if (room.phase === 'final') {
    const team = room.teams.get(teamId);
    const maxWager = Math.max(0, team.score);
    const wager = Math.max(0, Math.min(amount, maxWager));
    room.finalWagers[teamId] = wager;
    room.currentClue.wagers = room.currentClue.wagers || {};
    room.currentClue.wagers[teamId] = wager;
    return true;
  }
  return false;
}

export function startDailyDoubleAnswer(room) {
  if (room.phase !== 'dailydouble') return false;
  room.phase = 'answering';
  room.timerEnd = Date.now() + 10000;
  return true;
}

export function startFinalJeopardy(room) {
  if (room.phase !== 'board') return false;
  room.phase = 'final';
  const fj = room.rounds[room.rounds.length - 1];
  room.currentClue = {
    question: fj.question,
    answer: fj.answer,
    category: fj.category,
    value: 0,
    isFinal: true,
  };
  room.finalWagers = {};
  room.finalAnswers = {};
  room.timerEnd = Date.now() + 30000; // 30s for wager+answer
  return true;
}

export function revealFinalAnswer(room) {
  if (room.phase !== 'final') return false;
  room.finalRevealed = true;
  room.phase = 'final_judging';
  return true;
}

export function judgeFinalAnswer(room, teamId, correct) {
  if (room.phase !== 'final_judging') return false;
  const team = room.teams.get(teamId);
  const wager = room.finalWagers[teamId] || 0;
  if (correct) {
    team.score += wager;
  } else {
    team.score -= wager;
  }
  room.finalAnswers[teamId] = room.finalAnswers[teamId] || '';
  room.finalAnswers[teamId] += ' ✓';
  return true;
}

export function endGame(room) {
  room.phase = 'gameover';
}

function clueValue(clue) {
  return clue ? clue.value : 0;
}

function checkRoundComplete(room) {
  const allAnswered = room.board.categories.every((cat) =>
    cat.clues.every((c) => c.answered)
  );
  if (allAnswered && room.currentRoundIndex < room.rounds.length - 2) {
    room.currentRoundIndex += 1;
    const round = room.rounds[room.currentRoundIndex];
    room.dailyDoubles = createDailyDoubles(round);
    room.board = createBoard(round, room.dailyDoubles);
  }
}

export function getPublicState(room, forHost = false) {
  const teams = [];
  for (const [id, team] of room.teams.entries()) {
    const members = team.members
      .map((pid) => room.players.get(pid)?.name)
      .filter(Boolean);
    teams.push({ id, name: team.name, score: team.score, members });
  }

  const players = [];
  for (const [id, player] of room.players.entries()) {
    players.push({ id, name: player.name, teamId: player.teamId, isHost: player.isHost });
  }

  const state = {
    code: room.code,
    phase: room.phase,
    players,
    teams,
    board: room.board ? {
      categories: room.board.categories.map((cat) => ({
        name: cat.name,
        clues: cat.clues.map((c) => ({
          value: c.value,
          answered: c.answered,
          isDailyDouble: c.isDailyDouble,
        }))
      }))
    } : null,
    activeTeamId: room.activeTeamId,
    buzzOrder: Array.from(room.buzzOrder),
    currentClue: room.currentClue ? {
      value: room.currentClue.value,
      question: room.currentClue.question,
      category: room.currentClue.category || room.board?.categories[room.currentClue.categoryIndex]?.name,
      isDailyDouble: room.currentClue.isDailyDouble,
      isFinal: room.currentClue.isFinal,
      wager: room.currentClue.wager,
      submittedAnswer: forHost ? room.currentClue.submittedAnswer : undefined,
      answer: forHost ? room.currentClue.answer : undefined,
      finalWagers: forHost ? room.currentClue.wagers : undefined,
      finalAnswers: forHost ? room.finalAnswers : undefined,
    } : null,
    timerEnd: room.timerEnd,
    selectedByTeamId: room.selectedByTeamId,
    finalRevealed: room.finalRevealed,
  };

  return state;
}
