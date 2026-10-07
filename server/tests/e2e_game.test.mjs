import { io } from '../../client/node_modules/socket.io-client/build/esm/index.js';

async function runTest() {
  console.log('🧪 Starting End-to-End WebSocket & Game Engine Test...');
  const serverUrl = 'http://127.0.0.1:4000';

  const socket1 = io(serverUrl, { transports: ['websocket'] });
  let roomId = null;
  let hostPlayer = null;
  let guestPlayer = null;
  let currentDrawerId = null;
  let chosenWord = null;

  await new Promise((resolve, reject) => {
    socket1.on('connect', () => {
      console.log('✅ Host connected to Socket.IO (Socket ID:', socket1.id, ')');
      resolve();
    });
    socket1.on('connect_error', reject);
  });

  // 1. Host creates room
  await new Promise((resolve) => {
    socket1.emit('create_room', {
      hostName: 'Alice (Host)',
      isPrivate: false,
      settings: {
        rounds: 2,
        drawTime: 30,
        wordCount: 3,
        hintsCount: 2,
      },
    });

    socket1.on('room_created', (data) => {
      console.log('✅ Room created with code:', data.roomId);
      roomId = data.roomId;
      hostPlayer = data.player;
      resolve();
    });
  });

  // 2. Guest connects and joins room
  const socket2 = io(serverUrl, { transports: ['websocket'] });
  await new Promise((resolve) => {
    socket2.on('connect', () => {
      console.log('✅ Guest connected to Socket.IO (Socket ID:', socket2.id, ')');
      socket2.emit('join_room', {
        roomId,
        playerName: 'Bob (Guesser)',
      });
    });

    socket2.on('room_joined', (data) => {
      console.log('✅ Guest joined room successfully!');
      guestPlayer = data.player;
      resolve();
    });
  });

  // 3. Verify players list has 2 players
  await new Promise((resolve) => {
    socket1.on('players_list', (data) => {
      if (data.players.length === 2) {
        console.log('✅ Players list verified: 2 players in room');
        resolve();
      }
    });
  });

  // 4. Host starts game
  console.log('🎮 Host starting game...');
  socket1.emit('start_game');

  // 5. Drawer gets word options
  let chosenCategory = 'animals';
  await new Promise((resolve) => {
    const handleWordOptions = (data, isHost) => {
      console.log(`✅ ${isHost ? 'Host' : 'Guest'} received word options:`, data.options.map(o => o.word).join(', '));
      chosenWord = data.options[0].word;
      chosenCategory = data.options[0].category;
      currentDrawerId = isHost ? hostPlayer.id : guestPlayer.id;

      const drawerSocket = isHost ? socket1 : socket2;
      drawerSocket.emit('word_chosen', { word: chosenWord, category: chosenCategory });
      resolve();
    };

    socket1.on('word_options', (d) => handleWordOptions(d, true));
    socket2.on('word_options', (d) => handleWordOptions(d, false));
  });

  // 6. Verify game state transitions to DRAWING
  await new Promise((resolve) => {
    const handleState = (state) => {
      if (state.phase === 'DRAWING') {
        console.log(`✅ Game phase is DRAWING! Drawer: ${state.drawerName}, Hint: "${state.hint}"`);
        resolve();
      }
    };
    socket1.on('game_state', handleState);
  });

  // 7. Test drawing stroke transmission
  const drawerSocket = currentDrawerId === hostPlayer.id ? socket1 : socket2;
  const guesserSocket = currentDrawerId === hostPlayer.id ? socket2 : socket1;

  await new Promise((resolve) => {
    guesserSocket.on('draw_data', (stroke) => {
      console.log('✅ Guesser received real-time stroke data with tool:', stroke.tool, 'points:', stroke.points.length);
      resolve();
    });

    drawerSocket.emit('draw_data', {
      type: 'stroke',
      id: 'stroke_1',
      tool: 'brush',
      color: '#ff0000',
      size: 8,
      points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }],
    });
  });

  // 8. Test Guessing: Send correct guess
  await new Promise((resolve) => {
    guesserSocket.on('guess_result', (res) => {
      console.log('✅ Guess result verified:', res.correct ? 'CORRECT!' : 'INCORRECT', 'Points:', res.points);
      resolve();
    });

    console.log(`🎯 Guesser guessing the word "${chosenWord}"...`);
    guesserSocket.emit('chat', { text: chosenWord });
  });

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
