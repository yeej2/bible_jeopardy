import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createRoom,
  getRoom,
  getAllRooms,
  removeRoom,
  addPlayer,
  removePlayer,
  createTeam,
  joinTeam,
  startGame,
  selectClue,
  buzz,
  submitAnswer,
  judgeAnswer,
  submitWager,
  startDailyDoubleAnswer,
  startFinalJeopardy,
  revealFinalAnswer,
  judgeFinalAnswer,
  adjustScore,
  returnToBoard,
  resetCurrentClue,
  timeoutAnswer,
  nextQuestion,
  releaseFinalQuestion,
  hostMarkCorrect,
  endGame,
  getPublicState,
} from './game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const port = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

function broadcast(room) {
  for (const [id, player] of room.players.entries()) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      const state = getPublicState(room, player.isHost, player.teamId);
      socket.emit('stateUpdate', state);
    }
  }
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name }, cb) => {
    const { room, hostId } = createRoom(socket.id, name);
    addPlayer(room, socket.id, name, true);
    socket.join(room.code);
    if (cb) cb({ success: true, code: room.code, playerId: hostId });
    broadcast(room);
  });

  socket.on('joinRoom', ({ code, name }, cb) => {
    const room = getRoom(code.toUpperCase());
    if (!room) {
      if (cb) cb({ success: false, error: 'Room not found' });
      return;
    }
    const playerId = addPlayer(room, socket.id, name);
    socket.join(room.code);
    if (cb) cb({ success: true, code: room.code, playerId });
    broadcast(room);
  });

  socket.on('createTeam', ({ roomCode, name }, cb) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const teamId = createTeam(room, name);
    broadcast(room);
    if (cb) cb({ success: true, teamId });
  });

  socket.on('joinTeam', ({ roomCode, teamId }, cb) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const playerId = Array.from(room.players.values()).find((p) => p.socketId === socket.id)?.id;
    if (!playerId) return;
    joinTeam(room, playerId, teamId);
    broadcast(room);
    if (cb) cb({ success: true });
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (startGame(room)) broadcast(room);
  });

  socket.on('selectClue', ({ roomCode, categoryIndex, clueIndex }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (selectClue(room, room.activeTeamId, categoryIndex, clueIndex)) {
      broadcast(room);
    }
  });

  socket.on('buzz', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player) return;
    if (buzz(room, player.id)) broadcast(room);
  });

  socket.on('submitAnswer', ({ roomCode, answer }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player || !player.teamId) return;
    if (submitAnswer(room, player.teamId, answer)) broadcast(room);
  });

  socket.on('judgeAnswer', ({ roomCode, correct }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (judgeAnswer(room, correct)) broadcast(room);
  });

  socket.on('timeoutAnswer', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (timeoutAnswer(room)) broadcast(room);
  });

  socket.on('hostMarkCorrect', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (hostMarkCorrect(room)) broadcast(room);
  });

  socket.on('nextQuestion', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (nextQuestion(room)) broadcast(room);
  });

  socket.on('submitWager', ({ roomCode, amount }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player || !player.teamId) return;
    if (submitWager(room, player.teamId, amount)) broadcast(room);
  });

  socket.on('startDailyDoubleAnswer', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (startDailyDoubleAnswer(room)) broadcast(room);
  });

  socket.on('startFinalJeopardy', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (startFinalJeopardy(room)) broadcast(room);
  });

  socket.on('releaseFinalQuestion', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (releaseFinalQuestion(room)) broadcast(room);
  });

  socket.on('revealFinalAnswer', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (revealFinalAnswer(room)) broadcast(room);
  });

  socket.on('judgeFinalAnswer', ({ roomCode, teamId, correct }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (judgeFinalAnswer(room, teamId, correct)) broadcast(room);
  });

  socket.on('adjustScore', ({ roomCode, teamId, delta }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (adjustScore(room, teamId, delta)) broadcast(room);
  });

  socket.on('returnToBoard', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (returnToBoard(room)) broadcast(room);
  });

  socket.on('resetCurrentClue', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    if (resetCurrentClue(room)) broadcast(room);
  });

  socket.on('endGame', ({ roomCode }) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return;
    const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
    if (!player?.isHost) return;
    endGame(room);
    broadcast(room);
  });

  socket.on('disconnect', () => {
    for (const [code, room] of getAllRooms().entries()) {
      if (removePlayer(room, socket.id)) {
        if (room.players.size === 0) {
          removeRoom(code);
        } else {
          broadcast(room);
        }
      }
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Bible Jeopardy server running on port ${port}`);
});
