import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebcamFeed } from '../components/WebcamFeed';
import { HandTracker } from '../components/HandTracker';
import { Scene3D } from '../components/Scene3D';
import { HUD } from '../components/HUD';
import { StatusMessage } from '../components/StatusMessage';
import { segmentHitsCircle } from '../utils/collision';
import { spawnFruit } from '../utils/spawnFruit';
import { updateFruit } from '../utils/fruitMotion';
import { initAudio, playSwordSound, playSquishSound, playExplosionSound, playLoseLifeSound, playBombFuseSound } from '../utils/audio';
import { getTopScores, saveScore, saveBothScores } from '../utils/leaderboard';
import { useSocket } from '../hooks/useSocket';
import { joinGame, sendPlayerUpdate, sendGameOver, getSocket } from '../utils/socket';

export function GameScreen() {
  const [fruits, setFruits] = useState([]);
  const [particles, setParticles] = useState([]);
  const [bladePointsP1, setBladePointsP1] = useState([]);
  const [bladePointsP2, setBladePointsP2] = useState([]);
  
  const [playerMode, setPlayerMode] = useState('1P'); // '1P', '2P'
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30); 
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'gameover'
  
  const videoRef = useRef(null);
  const fruitIdCounter = useRef(0);
  const lastWooshTime = useRef(0);
  const gameLoopRafRef = useRef(null);
  
  const [initials, setInitials] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('normal');
  const [leaderboard, setLeaderboard] = useState([]);
  const [shake, setShake] = useState(false);

  // Network multiplayer state
  const [roomId, setRoomId] = useState(null);
  const [localPlayerId, setLocalPlayerId] = useState(null);
  const [opponentName, setOpponentName] = useState('');
  const [opponentBladePoints, setOpponentBladePoints] = useState([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [matchStatus, setMatchStatus] = useState('idle'); // 'idle', 'waiting', 'found', 'playing', 'ended'
  const [networkSeed, setNetworkSeed] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentTimeLeft, setOpponentTimeLeft] = useState(30);

  // Status message state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIcon, setStatusIcon] = useState('');
  const lastStatusUpdateRef = useRef(0);
  const lastStatusRef = useRef('');

  useSocket();

  useEffect(() => {
    getTopScores().then(data => setLeaderboard(data));
  }, []);

  useEffect(() => {
    if (gameState === 'gameover') {
      // Network mode: handled separately
      if (playerMode === 'network') {
        return;
      }
      // 1P mode: save score normally
      const bestScore = playerMode === '2P' ? Math.max(gameData.current.scoreP1, gameData.current.scoreP2) : gameData.current.scoreP1;
      if (bestScore > 0) {
        saveScore(initials || (playerMode==='2P' ? '2P_WINNER' : 'Anon'), bestScore).then(data => setLeaderboard(data));
      }
    }
  }, [gameState, initials, playerMode]);

  // Refs so socket handlers always read latest values without effect re-runs
  const localPlayerIdRef = useRef(null);
  const initialsRef = useRef('');
  const opponentNameRef = useRef('');
  useEffect(() => { localPlayerIdRef.current = localPlayerId; }, [localPlayerId]);
  useEffect(() => { initialsRef.current = initials; }, [initials]);
  useEffect(() => { opponentNameRef.current = opponentName; }, [opponentName]);

  // Socket event listeners for network multiplayer
  useEffect(() => {
    if (playerMode !== 'network') return;

    const socket = getSocket();

    const handleMatchFound = (data) => {
      console.log('Match found!', data);
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setOpponentName(data.opponentName);
      setNetworkSeed(data.seed);
      setGameStartTime(data.startTime);
      setMatchStatus('found');
    };

    const handleOpponentUpdate = (data) => {
      setOpponentBladePoints(data.bladePoints || []);
      setOpponentScore(data.score);
      if (data.timeLeft !== undefined) setOpponentTimeLeft(data.timeLeft);
    };

    const handleGameEnded = (data) => {
      console.log('Game ended:', data);
      setMatchStatus('ended');
      const p1Score = data.p1Score;
      const p2Score = data.p2Score;
      saveBothScores(
        initialsRef.current,
        localPlayerIdRef.current === 1 ? p1Score : p2Score,
        opponentNameRef.current,
        localPlayerIdRef.current === 1 ? p2Score : p1Score
      ).then(leaderboardData => {
        setLeaderboard(leaderboardData);
      });
      setGameState('gameover');
    };

    const handleOpponentDisconnected = () => {
      console.log('Opponent disconnected');
      setOpponentDisconnected(true);
      setMatchStatus('ended');
      setGameState('gameover');
    };

    socket.on('match-found', handleMatchFound);
    socket.on('opponent-update', handleOpponentUpdate);
    socket.on('game-ended', handleGameEnded);
    socket.on('opponent-disconnected', handleOpponentDisconnected);

    return () => {
      socket.off('match-found', handleMatchFound);
      socket.off('opponent-update', handleOpponentUpdate);
      socket.off('game-ended', handleGameEnded);
      socket.off('opponent-disconnected', handleOpponentDisconnected);
    };
  }, [playerMode]); // No gameState dep — prevents duplicate listener accumulation

  // Auto-start game when match is found
  useEffect(() => {
    if (matchStatus === 'found' && localPlayerId && networkSeed !== null) {
      const timer = setTimeout(() => {
        startNetworkGame(localPlayerId, networkSeed);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [matchStatus, localPlayerId, networkSeed]);

  // Update status messages during spectating
  useEffect(() => {
    if (playerMode === 'network' && gameState === 'gameover') {
      updateStatusMessage(scoreP1, opponentScore);
    }
  }, [opponentScore, playerMode, gameState, scoreP1]); 
  
  // Need refs for the game loop to access latest state without re-running useEffect
  const gameData = useRef({
    fruits: [],
    bladePointsP1: [],
    bladePointsP2: [],
    particles: [],
    scoreP1: 0,
    scoreP2: 0,
    lives: 3,
    timeLeftMs: 30000,
    playerMode: '1P',
    difficulty: 'normal'
  });

  // Sync refs with state when necessary
  useEffect(() => {
    gameData.current.bladePointsP1 = bladePointsP1;
    gameData.current.bladePointsP2 = bladePointsP2;
    gameData.current.playerMode = playerMode;
  }, [bladePointsP1, bladePointsP2, playerMode]);

  const checkSwipeSound = (points) => {
    initAudio();
    if (points && points.length >= 2) {
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > 50 && performance.now() - lastWooshTime.current > 300) {
         playSwordSound();
         lastWooshTime.current = performance.now();
      }
    }
  };

  const updateStatusMessage = (myScore, oppScore) => {
    if (playerMode !== 'network') return;

    const now = Date.now();
    // Debounce: only update status every 2 seconds
    if (now - lastStatusUpdateRef.current < 2000) return;

    let newStatus = '';
    let newIcon = '';
    const diff = myScore - oppScore;

    // More variety based on game state with taunts & hype
    const messages = [
      // When ahead - crushing it
      { condition: diff > 100, status: "ABSOLUTELY DOMINATING! 🤴", icon: '👑' },
      { condition: diff > 50, status: "You're crushing it! 🔥", icon: '🔥' },
      { condition: diff > 30, status: "Oh they're getting cooked! 👨‍🍳", icon: '👨‍🍳' },
      { condition: diff > 20, status: "You're in the zone!", icon: '⚡' },
      { condition: diff > 10, status: "Building momentum...", icon: '📈' },
      { condition: diff > 0, status: "Slight lead...", icon: '👀' },
      // Close - intense battle
      { condition: diff > -10 && diff <= 0, status: "Neck and neck! 🔥", icon: '⚔️' },
      { condition: diff > -20 && diff <= -10, status: "Getting tight!", icon: '😤' },
      // When behind - taunts & pressure
      { condition: diff > -40 && diff <= -20, status: "You're slipping! 📉", icon: '💧' },
      { condition: diff > -60 && diff <= -40, status: "Oh you're getting cooked! 🍳", icon: '🍳' },
      { condition: diff > -100 && diff <= -60, status: "Crazy out here! 😬", icon: '🌪️' },
      { condition: diff <= -100, status: "GETTING ABSOLUTELY STYLED ON! 😱", icon: '💥' },
    ];

    for (const msg of messages) {
      if (msg.condition) {
        newStatus = msg.status;
        newIcon = msg.icon;
        break;
      }
    }

    // Only show new status if it's different
    if (newStatus !== lastStatusRef.current) {
      setStatusMessage(newStatus);
      setStatusIcon(newIcon);
      lastStatusUpdateRef.current = now;
      lastStatusRef.current = newStatus;
    }
  };

  const handleBladeMove = useCallback((data) => {
    // In network mode, each player is on their own camera — first detected hand is always p1
    if (playerMode === 'network') {
      if (data.p1 && data.p1.length > 0) {
        setBladePointsP1(data.p1);
        checkSwipeSound(data.p1);
      }
    } else {
      // Local mode: both players
      if (data.p1) {
        setBladePointsP1(data.p1);
        checkSwipeSound(data.p1);
      }
      if (data.p2) {
        setBladePointsP2(data.p2);
        checkSwipeSound(data.p2);
      }
    }
  }, [playerMode, localPlayerId]);

  const handleMouseMove = useCallback((e) => {
    // Fallback mouse control - map purely to P1
    setBladePointsP1(prev => {
      const newPoints = [...prev, { x: e.clientX, y: e.clientY }];
      if (newPoints.length > 10) newPoints.shift();
      checkSwipeSound(newPoints);
      return newPoints;
    });
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    let spawnTimer = 0;
    let timeElapsedMs = 0;

    const gameLoop = (time) => {
      if ((gameData.current.lives <= 0 && gameData.current.playerMode !== '2P') || gameState !== 'playing') return;

      const dt = time - lastTime;
      lastTime = time;
      timeElapsedMs += dt;

      // Update Time accurately using Ref
      gameData.current.timeLeftMs -= dt;
      if (gameData.current.timeLeftMs <= 0 && !gameData.current.gameOverSent) {
        gameData.current.timeLeftMs = 0;
        gameData.current.gameOverSent = true;
        if (gameData.current.playerMode === 'network' && roomId && gameData.current.playerId) {
          // In network mode the local player's score is always in scoreP1 (single hand = P1)
          sendGameOver(roomId, gameData.current.scoreP1, gameData.current.playerId);
          setMatchStatus('ended');
        }
        setGameState('gameover');
      }
      setTimeLeft(Math.ceil(gameData.current.timeLeftMs / 1000));

      // RAMP DIFFICULTY
      const timeElapsedSecs = timeElapsedMs / 1000;
      let targetSpawnDelay = 1500 - (timeElapsedSecs * 30);
      if (gameData.current.difficulty === 'hard') targetSpawnDelay *= 0.6; // 40% faster spawns on Hard!
      if (targetSpawnDelay < 400) targetSpawnDelay = 400; 

      // Spawn Fruits
      spawnTimer += dt;
      if (spawnTimer > targetSpawnDelay) {
        spawnTimer = 0;
        if (gameData.current.playerMode === 'network') {
          // In network mode, each player spawns their own fruits
          const side = gameData.current.playerId === 1 ? 'left' : 'right';
          const fruit = spawnFruit(fruitIdCounter.current++, side, gameData.current.difficulty);
          gameData.current.fruits.push(fruit);
          if (fruit.type === 'bomb') playBombFuseSound();
        } else if (gameData.current.playerMode === '2P') {
          // Dedicated Left and Right Spawns
          const fruit1 = spawnFruit(fruitIdCounter.current++, 'left', gameData.current.difficulty);
          const fruit2 = spawnFruit(fruitIdCounter.current++, 'right', gameData.current.difficulty);
          gameData.current.fruits.push(fruit1);
          gameData.current.fruits.push(fruit2);
          if (fruit1.type === 'bomb') playBombFuseSound();
          if (fruit2.type === 'bomb') playBombFuseSound();
        } else {
          // Global Spawn
          const fruit = spawnFruit(fruitIdCounter.current++, 'any', gameData.current.difficulty);
          gameData.current.fruits.push(fruit);
          if (fruit.type === 'bomb') playBombFuseSound();
        }
      }

      // Physics & Collision
      const blade1 = gameData.current.bladePointsP1;
      const blade2 = gameData.current.bladePointsP2;
      const is2P = gameData.current.playerMode === '2P';
      let nsP1 = gameData.current.scoreP1;
      let nsP2 = gameData.current.scoreP2;
      let newLives = gameData.current.lives;

      const nextFruits = [];
      const nextParticles = gameData.current.particles.filter(p => time - p.createdAt < (p.type === 'bomb' ? 1500 : 500)); 

      for (const fruit of gameData.current.fruits) {
        updateFruit(fruit);

        if (!fruit.sliced) {
          // Check collision with blade1 and blade2
          let sliced = false;
          let slicer = 1;
          let sliceAngle = 0;
          
          for (let i = 0; i < blade1.length - 1; i++) {
            if (segmentHitsCircle(blade1[i], blade1[i+1], fruit)) {
              sliced = true; slicer = 1;
              sliceAngle = Math.atan2(blade1[i+1].y - blade1[i].y, blade1[i+1].x - blade1[i].x);
              break;
            }
          }
          
          if (!sliced && is2P) {
             for (let i = 0; i < blade2.length - 1; i++) {
                if (segmentHitsCircle(blade2[i], blade2[i+1], fruit)) {
                  sliced = true; slicer = 2;
                  sliceAngle = Math.atan2(blade2[i+1].y - blade2[i].y, blade2[i+1].x - blade2[i].x);
                  break;
                }
             }
          }

          if (sliced) {
            if (fruit.type === 'bomb') {
              playExplosionSound();
              setShake(true);
              if (is2P) {
                  // In 2P, hitting a bomb penalizes the slicer directly
                  if (slicer === 1) nsP1 -= 50; else nsP2 -= 50;
                  // Don't die, just lose points
              } else {
                  newLives = 0;
              }
              fruit.sliced = true;
              fruit.sliceTime = time;
              nextParticles.push({ id: fruit.id + '-p', x: fruit.x, y: fruit.y, createdAt: time, sliceAngle, type: fruit.type });
            } else {
              if (slicer === 1) nsP1 += 10;
              else nsP2 += 10;
              
              fruit.sliced = true;
              fruit.sliceTime = time;
              fruit.sliceAngle = sliceAngle;
              fruit.vx *= 0.5; // Dampen horizontal movement slightly on impact
              nextFruits.push(fruit); // Keep for slice animation 
              nextParticles.push({ id: fruit.id + '-p', x: fruit.x, y: fruit.y, createdAt: time, sliceAngle, type: fruit.type });
              playSquishSound();
            }
          } else if (fruit.y > window.innerHeight + 100 && fruit.vy > 0) {
            // Missed fruit: penalize only in 1P mode if it's not a bomb
            if (!is2P && fruit.type !== 'bomb') newLives -= 1; 
          } else {
            nextFruits.push(fruit);
          }
        } else {
          // It is sliced, stay in the loop to let it animate moving apart and falling down
          if (time - fruit.sliceTime < 1500) {
            nextFruits.push(fruit);
          }
        }
      }

      gameData.current.fruits = nextFruits;
      gameData.current.particles = nextParticles;

      if (nsP1 !== gameData.current.scoreP1) { gameData.current.scoreP1 = nsP1; setScoreP1(nsP1); }
      if (nsP2 !== gameData.current.scoreP2) { gameData.current.scoreP2 = nsP2; setScoreP2(nsP2); }

      // Update status message for network multiplayer
      if (playerMode === 'network') {
        updateStatusMessage(nsP1, opponentScore);
      }

      if (newLives !== gameData.current.lives) {
        if (newLives < gameData.current.lives) {
          playLoseLifeSound();
        }
        gameData.current.lives = newLives;
        setLives(Math.max(0, newLives));
        if (newLives <= 0 && !is2P) {
          // In network mode, send game-over so the server can resolve the match
          if (gameData.current.playerMode === 'network' && roomId && gameData.current.playerId && !gameData.current.gameOverSent) {
            gameData.current.gameOverSent = true;
            // In network mode the local player's score is always in scoreP1 (single hand = P1)
            sendGameOver(roomId, gameData.current.scoreP1, gameData.current.playerId);
          }
          setGameState('gameover');
        }
      }

      // Network sync for multiplayer mode (throttled to ~30fps)
      if (playerMode === 'network' && gameData.current.timeLeftMs > 0 && roomId) {
        const now = Date.now();
        if (!gameData.current.lastNetworkSync || now - gameData.current.lastNetworkSync > 33) {
          // In network mode the local player's score is always in nsP1 (single hand = P1)
          sendPlayerUpdate(roomId, gameData.current.bladePointsP1, nsP1, Math.ceil(gameData.current.timeLeftMs / 1000), gameData.current.playerId);
          gameData.current.lastNetworkSync = now;
        }
      }

      setFruits([...nextFruits]);
      setParticles([...nextParticles]);

      if (gameState === 'playing' && (gameData.current.lives > 0 || is2P || playerMode === 'network')) {
        gameLoopRafRef.current = requestAnimationFrame(gameLoop);
      }
    };

    if (gameState === 'playing' && (lives > 0 || playerMode === '2P')) {
      gameLoopRafRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      cancelAnimationFrame(gameLoopRafRef.current);
      gameLoopRafRef.current = null;
    };
  }, [gameState, playerMode]); // Restart loop when gameState changes

  const resetGame = () => {
    setScoreP1(0);
    setScoreP2(0);
    setLives(3);
    setTimeLeft(30);
    setFruits([]);
    setParticles([]);
    setBladePointsP1([]);
    setBladePointsP2([]);
    gameData.current = { fruits: [], bladePointsP1: [], bladePointsP2: [], particles: [], scoreP1: 0, scoreP2: 0, lives: 3, timeLeftMs: 30000, playerMode, difficulty: difficultyLevel, gameOverSent: false };
    setShake(false);
    setMatchStatus('idle');
    setRoomId(null);
    setLocalPlayerId(null);
    setOpponentName('');
    setOpponentBladePoints([]);
    setOpponentScore(0);
    setOpponentTimeLeft(30);
    setOpponentDisconnected(false);
    setGameState('start');
  };

  const backToMenu = () => {
    // Reset and go back to start menu
    setScoreP1(0);
    setScoreP2(0);
    setLives(3);
    setTimeLeft(30);
    setFruits([]);
    setParticles([]);
    setBladePointsP1([]);
    setBladePointsP2([]);
    gameData.current = { fruits: [], bladePointsP1: [], bladePointsP2: [], particles: [], scoreP1: 0, scoreP2: 0, lives: 3, timeLeftMs: 30000, playerMode: '1P', difficulty: difficultyLevel, gameOverSent: false };
    setShake(false);
    setMatchStatus('idle');
    setRoomId(null);
    setLocalPlayerId(null);
    setOpponentName('');
    setOpponentBladePoints([]);
    setOpponentScore(0);
    setOpponentTimeLeft(30);
    setOpponentDisconnected(false);
    setGameState('start');
  };

  const startGame = (mode) => {
    if (mode === 'network') {
      // Network multiplayer mode
      setPlayerMode('network');
      setMatchStatus('waiting');
      joinGame(initials, difficultyLevel);
    } else {
      // Local 1P mode
      setPlayerMode(mode);
      gameData.current = { fruits: [], bladePointsP1: [], bladePointsP2: [], particles: [], scoreP1: 0, scoreP2: 0, lives: 3, timeLeftMs: 30000, playerMode: mode, difficulty: difficultyLevel, gameOverSent: false };
      setGameState('playing');
    }
  };

  const startNetworkGame = (playerId, seed) => {
    // Initialize game with network seed and local player ID
    setLocalPlayerId(playerId);
    gameData.current = {
      fruits: [],
      bladePointsP1: [],
      bladePointsP2: [],
      particles: [],
      scoreP1: 0,
      scoreP2: 0,
      lives: 3,
      timeLeftMs: 30000,
      playerMode: 'network',
      difficulty: difficultyLevel,
      seed: seed,
      playerId: playerId,
      gameOverSent: false
    };
    setScoreP1(0);
    setScoreP2(0);
    setMatchStatus('playing');
    setGameState('playing');
  };

  // Spectator feedback message (shown when knocked out and watching opponent)
  const spectatorFeedback = (() => {
    if (playerMode !== 'network' || gameState !== 'gameover' || matchStatus === 'ended') return null;
    const diff = opponentScore - scoreP1;
    if (opponentTimeLeft <= 3)  return { msg: '3... 2... 1... ALMOST DONE!', color: '#ffde00' };
    if (opponentTimeLeft <= 5)  return { msg: `ONLY ${opponentTimeLeft}s LEFT! HANG TIGHT!`, color: '#ffde00' };
    if (opponentTimeLeft <= 10) return { msg: `${opponentTimeLeft}s TO GO! STAY CALM!`, color: '#ff9900' };
    if (diff > 150) return { msg: 'ABSOLUTELY GETTING COOKED OUT HERE 🔥', color: '#ff4444' };
    if (diff > 80)  return { msg: 'OH WOW GETTING STYLED ON 😱', color: '#ff6600' };
    if (diff > 40)  return { msg: "THEY'RE COOKING YOU RIGHT NOW 🍳", color: '#ff9900' };
    if (diff > 10)  return { msg: "THEY'RE PULLING AHEAD...", color: '#ffcc00' };
    if (diff < -80) return { msg: "THEY CAN'T CATCH YOU NOW! 👑", color: '#00ff00' };
    if (diff < -40) return { msg: 'YOUR LEAD IS MASSIVE! 💪', color: '#00ff88' };
    if (diff < -10) return { msg: "YOU'RE AHEAD! HOLD ON! 😤", color: '#00ffff' };
    return { msg: "IT'S NECK AND NECK! ⚔️", color: '#ff00ff' };
  })();

  // Determine winner locally for text rendering
  let winnerText = `SCORE: ${scoreP1}`;
  if (playerMode === 'network') {
      if (localPlayerId === 1) {
          if (scoreP1 > opponentScore) winnerText = `YOU WIN! (${scoreP1} TO ${opponentScore})`;
          else if (opponentScore > scoreP1) winnerText = `YOU LOSE! (${scoreP1} TO ${opponentScore})`;
          else winnerText = `TIE BATTLE! (${scoreP1} TO ${opponentScore})`;
      } else {
          if (scoreP1 > opponentScore) winnerText = `YOU WIN! (${scoreP1} TO ${opponentScore})`;
          else if (opponentScore > scoreP1) winnerText = `YOU LOSE! (${scoreP1} TO ${opponentScore})`;
          else winnerText = `TIE BATTLE! (${scoreP1} TO ${opponentScore})`;
      }
  } else if (playerMode === '2P') {
      if (scoreP1 > scoreP2) winnerText = `P1 WINS! (${scoreP1} TO ${scoreP2})`;
      else if (scoreP2 > scoreP1) winnerText = `P2 WINS! (${scoreP2} TO ${scoreP1})`;
      else winnerText = `TIE BATTLE! (${scoreP1} TO ${scoreP2})`;
  }

  return (
    <div
      className={shake ? 'shake-active' : ''}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: gameState !== 'playing' ? '#000' : undefined }}
      onPointerMove={gameState === 'playing' ? handleMouseMove : undefined} // Fallback mouse control maps to P1
    >
      {gameState === 'playing' && (
        <>
          <WebcamFeed ref={videoRef} />
          <HandTracker videoRef={videoRef} onBladeMove={handleBladeMove} />
        </>
      )}
      {gameState === 'playing' && <Scene3D fruits={fruits} bladePointsP1={bladePointsP1} bladePointsP2={playerMode === '2P' ? bladePointsP2 : []} particles={particles} playerMode={playerMode} />}
      {gameState === 'playing' && <HUD scoreP1={scoreP1} scoreP2={scoreP2} lives={lives} timeLeft={timeLeft} playerMode={playerMode} />}

      {/* Spectator mode - when you're out but opponent is still playing */}
      {playerMode === 'network' && gameState === 'gameover' && matchStatus !== 'ended' && (
        <>
          <Scene3D fruits={[]} bladePointsP1={opponentBladePoints} bladePointsP2={[]} particles={[]} playerMode={playerMode} />
          <div className="retro-font" style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            color: '#ff9900', fontSize: '20px', textShadow: '2px 2px 0px rgba(0,0,0,1)',
            pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
            backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px 20px', border: '2px solid #ff9900'
          }}>
            SPECTATING {opponentName}
          </div>
          <div className="retro-font" style={{
            position: 'absolute', top: '75px', left: '50%', transform: 'translateX(-50%)',
            color: '#ff00ff', fontSize: '18px', textShadow: '2px 2px 0px rgba(0,0,0,1)',
            pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap'
          }}>
            YOU: {scoreP1} | THEM: {opponentScore}
          </div>
          <div className="retro-font" style={{
            position: 'absolute', top: '115px', left: '50%', transform: 'translateX(-50%)',
            color: opponentTimeLeft <= 10 ? '#ff4444' : '#ffffff',
            fontSize: '16px', textShadow: '2px 2px 0px rgba(0,0,0,1)',
            pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap'
          }}>
            TIME LEFT: {opponentTimeLeft}s
          </div>
          {spectatorFeedback && (
            <div className="retro-font" style={{
              position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
              color: spectatorFeedback.color, fontSize: '18px',
              textShadow: `2px 2px 0px rgba(0,0,0,1)`, pointerEvents: 'none', zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.85)', padding: '12px 24px',
              border: `2px solid ${spectatorFeedback.color}`, whiteSpace: 'nowrap'
            }}>
              {spectatorFeedback.msg}
            </div>
          )}
        </>
      )}

      {playerMode === 'network' && (
        <StatusMessage message={statusMessage} icon={statusIcon} />
      )}
      
      {gameState === 'playing' && playerMode === '2P' && (
        <div style={{
          position: 'absolute', top: 0, left: '50%', width: '4px', height: '100%',
          background: 'lime', zIndex: 5, pointerEvents: 'none', boxShadow: '0 0 15px lime'
        }} />
      )}

      {gameState === 'start' && (
        <div className="retro-overlay retro-font">
          <h1 className="retro-title">FRUIT NINJA</h1>
          <p className="retro-text">
            HOLD HAND TO CAMERA<br/><br/>
            ENTER YOUR NAME (3-10 CHARS)
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              maxLength={10}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="retro-input retro-font"
              placeholder="Name"
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '1.2rem' }}>DIFF:</span>
            <button 
               onClick={() => setDifficultyLevel('normal')} 
               className="retro-font"
               style={{ cursor: 'pointer', padding: '10px 15px', border: difficultyLevel === 'normal' ? '2px solid lime' : '2px solid gray', background: difficultyLevel === 'normal' ? 'lime' : 'black', color: difficultyLevel === 'normal' ? 'black' : 'lime' }}
            >NORM</button>
            <button 
               onClick={() => setDifficultyLevel('hard')} 
               className="retro-font"
               style={{ cursor: 'pointer', padding: '10px 15px', border: difficultyLevel === 'hard' ? '2px solid lime' : '2px solid gray', background: difficultyLevel === 'hard' ? 'lime' : 'black', color: difficultyLevel === 'hard' ? 'black' : 'lime' }}
            >HARD</button>
          </div>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
             <button
                disabled={initials.length < 3}
                onClick={() => startGame('1P')}
                className="retro-button retro-font"
             >
                1 PLAYER
             </button>
             <button
                disabled={initials.length < 3 || matchStatus !== 'idle'}
                onClick={() => startGame('network')}
                className="retro-button retro-font"
                style={{ background: initials.length >= 3 && matchStatus === 'idle' ? '#ff00ff' : '#555', color: '#fff' }}
             >
                {matchStatus === 'waiting' ? 'FINDING MATCH...' : '2 PLAYER ONLINE'}
             </button>
          </div>

          <div className="retro-leaderboard retro-font" style={{ marginTop: '1rem' }}>
            <h2>🏆 HIGH SCORES</h2>
            {leaderboard.map((entry, idx) => (
              <div key={idx} className="retro-leaderboard-entry">
                <span>{entry.name}</span>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState === 'gameover' && !(playerMode === 'network' && matchStatus !== 'ended') && (
        <div className="retro-overlay retro-font">
          <h1 className="retro-gameover-title">GAME OVER</h1>
          <p className="retro-text" style={{ fontSize: '24px' }}>{winnerText}</p>
          {opponentDisconnected ? (
            <p className="retro-text" style={{ color: 'red' }}>Opponent disconnected!</p>
          ) : (
            <p className="retro-text" style={{ color: 'yellow' }}>Top score saved for {initials || 'Anon'}!</p>
          )}

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={resetGame}
              className="retro-button retro-font"
            >
              {playerMode === 'network' ? 'MENU' : 'RESTART'}
            </button>
          </div>
        </div>
      )}

      {playerMode === 'network' && matchStatus === 'waiting' && gameState === 'start' && (
        <div className="retro-overlay retro-font">
          <h1 className="retro-title">FINDING OPPONENT...</h1>
          <p className="retro-text" style={{ fontSize: '20px', marginTop: '2rem' }}>
            Waiting for a worthy opponent...
          </p>
          <div style={{ marginTop: '2rem', fontSize: '40px' }}>⏳</div>
          <button
            onClick={resetGame}
            className="retro-button retro-font"
            style={{ marginTop: '2rem', background: '#555' }}
          >
            CANCEL
          </button>
        </div>
      )}

      {playerMode === 'network' && matchStatus === 'found' && gameState === 'start' && (
        <div className="retro-overlay retro-font">
          <h1 className="retro-title">MATCH FOUND!</h1>
          <p className="retro-text" style={{ fontSize: '20px', marginTop: '2rem' }}>
            Opponent: {opponentName}
          </p>
          <p className="retro-text" style={{ marginTop: '1rem' }}>
            Starting game...
          </p>
        </div>
      )}
    </div>
  );
}
