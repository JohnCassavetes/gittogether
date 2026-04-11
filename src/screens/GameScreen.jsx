import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebcamFeed } from '../components/WebcamFeed';
import { HandTracker } from '../components/HandTracker';
import { Scene3D } from '../components/Scene3D';
import { HUD } from '../components/HUD';
import { segmentHitsCircle } from '../utils/collision';
import { spawnFruit } from '../utils/spawnFruit';
import { updateFruit } from '../utils/fruitMotion';
import { initAudio, playSwordSound, playSquishSound, playExplosionSound } from '../utils/audio';
import { getTopScores, saveScore } from '../utils/leaderboard';

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
  
  const [initials, setInitials] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('normal');
  const [leaderboard, setLeaderboard] = useState([]);
  const [shake, setShake] = useState(false);
  
  useEffect(() => {
    getTopScores().then(data => setLeaderboard(data));
  }, []);

  useEffect(() => {
    if (gameState === 'gameover') {
      const bestScore = playerMode === '2P' ? Math.max(gameData.current.scoreP1, gameData.current.scoreP2) : gameData.current.scoreP1;
      if (bestScore > 0) {
        saveScore(initials || (playerMode==='2P' ? '2P_WINNER' : 'Anon'), bestScore).then(data => setLeaderboard(data));
      }
    }
  }, [gameState, initials, playerMode]); 
  
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

  const handleBladeMove = useCallback((data) => {
    // Data comes from 2 Hands HandTracker as { p1: [], p2: [] }
    if (data.p1) {
      setBladePointsP1(data.p1);
      checkSwipeSound(data.p1);
    }
    if (data.p2) {
      setBladePointsP2(data.p2);
      checkSwipeSound(data.p2);
    }
  }, []);

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
      if ((gameData.current.playerMode === '1P' && gameData.current.lives <= 0) || gameState !== 'playing') return;

      const dt = time - lastTime;
      lastTime = time;
      timeElapsedMs += dt;

      // Update Time accurately using Ref
      gameData.current.timeLeftMs -= dt;
      if (gameData.current.timeLeftMs <= 0) {
        gameData.current.timeLeftMs = 0;
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
        if (gameData.current.playerMode === '2P') {
          // Dedicated Left and Right Spawns
          gameData.current.fruits.push(spawnFruit(fruitIdCounter.current++, 'left', gameData.current.difficulty));
          gameData.current.fruits.push(spawnFruit(fruitIdCounter.current++, 'right', gameData.current.difficulty));
        } else {
          // Global Spawn
          gameData.current.fruits.push(spawnFruit(fruitIdCounter.current++, 'any', gameData.current.difficulty));
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
      
      if (newLives !== gameData.current.lives) {
        gameData.current.lives = newLives;
        setLives(Math.max(0, newLives));
        if (newLives <= 0 && !is2P) {
           setGameState('gameover');
        }
      }

      setFruits([...nextFruits]);
      setParticles([...nextParticles]);

      if (gameState === 'playing' && (gameData.current.lives > 0 || is2P)) {
        requestAnimationFrame(gameLoop);
      }
    };

    let rafId;
    if (gameState === 'playing' && (lives > 0 || playerMode === '2P')) {
      rafId = requestAnimationFrame(gameLoop);
    }
    
    return () => cancelAnimationFrame(rafId);
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
    gameData.current = { fruits: [], bladePointsP1: [], bladePointsP2: [], particles: [], scoreP1: 0, scoreP2: 0, lives: 3, timeLeftMs: 30000, playerMode, difficulty: difficultyLevel };
    setShake(false);
    setGameState('start');
  };

  const startGame = (mode) => {
    setPlayerMode(mode);
    gameData.current = { fruits: [], bladePointsP1: [], bladePointsP2: [], particles: [], scoreP1: 0, scoreP2: 0, lives: 3, timeLeftMs: 30000, playerMode: mode, difficulty: difficultyLevel };
    setGameState('playing');
  }

  // Determine winner locally for text rendering
  let winnerText = `SCORE: ${scoreP1}`;
  if (playerMode === '2P') {
      if (scoreP1 > scoreP2) winnerText = `P1 WINS! (${scoreP1} TO ${scoreP2})`;
      else if (scoreP2 > scoreP1) winnerText = `P2 WINS! (${scoreP2} TO ${scoreP1})`;
      else winnerText = `TIE BATTLE! (${scoreP1} TO ${scoreP2})`;
  }

  return (
    <div 
      className={shake ? 'shake-active' : ''}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      onPointerMove={handleMouseMove} // Fallback mouse control maps to P1 
    >
      <WebcamFeed ref={videoRef} />
      <HandTracker videoRef={videoRef} onBladeMove={handleBladeMove} />
      <Scene3D fruits={fruits} bladePointsP1={bladePointsP1} bladePointsP2={playerMode === '2P' ? bladePointsP2 : []} particles={particles} />
      <HUD scoreP1={scoreP1} scoreP2={scoreP2} lives={lives} timeLeft={timeLeft} playerMode={playerMode} />
      
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
            ENTER YOUR INITIALS
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="text" 
              maxLength={3} 
              value={initials} 
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="retro-input retro-font"
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
                disabled={!initials}
                onClick={() => startGame('1P')}
                className="retro-button retro-font"
             >
                1 PLAYER
             </button>
             <button 
                disabled={!initials}
                onClick={() => startGame('2P')}
                className="retro-button retro-font"
                style={{ background: initials ? '#ff00ff' : '#555', color: '#fff' }}
             >
                2 PLAYER VS
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

      {gameState === 'gameover' && (
        <div className="retro-overlay retro-font">
          <h1 className="retro-gameover-title">GAME OVER</h1>
          <p className="retro-text" style={{ fontSize: '24px' }}>{winnerText}</p>
          <p className="retro-text" style={{ color: 'yellow' }}>Top score saved for {initials || 'Anon'}!</p>
          
          <button 
            onClick={resetGame}
            className="retro-button retro-font"
          >
            RESTART 
          </button>
        </div>
      )}
    </div>
  );
}
