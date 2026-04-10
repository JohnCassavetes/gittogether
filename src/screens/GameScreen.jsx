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
  const [bladePoints, setBladePoints] = useState([]);
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'gameover'
  
  const videoRef = useRef(null);
  const fruitIdCounter = useRef(0);
  const lastWooshTime = useRef(0);
  
  const [initials, setInitials] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [shake, setShake] = useState(false);
  
  useEffect(() => {
    getTopScores().then(data => setLeaderboard(data));
  }, []);

  useEffect(() => {
    if (gameState === 'gameover' && gameData.current.score > 0) {
      saveScore(initials, gameData.current.score).then(data => setLeaderboard(data));
    }
  }, [gameState]); // Only runs ONCE when gameover triggers!
  
  // Need refs for the game loop to access latest state without re-running useEffect
  const gameData = useRef({
    fruits: [],
    bladePoints: [],
    particles: [],
    score: 0,
    lives: 3
  });

  // Sync refs with state when necessary, or just rely on the loop for fruits
  useEffect(() => {
    gameData.current.bladePoints = bladePoints;
  }, [bladePoints]);

  const checkSwipeSound = (points) => {
    initAudio();
    if (points.length >= 2) {
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > 50 && performance.now() - lastWooshTime.current > 300) {
         playSwordSound();
         lastWooshTime.current = performance.now();
      }
    }
  };

  const handleBladeMove = useCallback((points) => {
    setBladePoints(points);
    checkSwipeSound(points);
  }, []);

  const handleMouseMove = useCallback((e) => {
    setBladePoints(prev => {
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
      if (gameData.current.lives <= 0 || gameState !== 'playing') return;

      const dt = time - lastTime;
      lastTime = time;
      timeElapsedMs += dt;

      // Update Time
      setTimeLeft(prev => {
        const nextTime = Math.max(0, prev - dt / 1000);
        if (nextTime === 0) setGameState('gameover');
        return nextTime;
      });

      // RAMP DIFFICULTY: reduce required elapsed time to spawn next fruit as time passes.
      const timeElapsedSecs = timeElapsedMs / 1000;
      let targetSpawnDelay = 1500 - (timeElapsedSecs * 30);
      if (targetSpawnDelay < 400) targetSpawnDelay = 400; // Cap max speed

      // Spawn Fruits
      spawnTimer += dt;
      if (spawnTimer > targetSpawnDelay) {
        spawnTimer = 0;
        const newFruit = spawnFruit(fruitIdCounter.current++);
        gameData.current.fruits.push(newFruit);
      }

      // Physics & Collision
      const currentBlade = gameData.current.bladePoints;
      let newScore = gameData.current.score;
      let newLives = gameData.current.lives;

      const nextFruits = [];
      const nextParticles = gameData.current.particles.filter(p => time - p.createdAt < (p.type === 'bomb' ? 1500 : 500)); 

      for (const fruit of gameData.current.fruits) {
        updateFruit(fruit);

        if (!fruit.sliced) {
          // Check collision with blade
          let sliced = false;
          let sliceAngle = 0;
          for (let i = 0; i < currentBlade.length - 1; i++) {
            if (segmentHitsCircle(currentBlade[i], currentBlade[i+1], fruit)) {
              sliced = true;
              sliceAngle = Math.atan2(currentBlade[i+1].y - currentBlade[i].y, currentBlade[i+1].x - currentBlade[i].x);
              break;
            }
          }

          if (sliced) {
            if (fruit.type === 'bomb') {
              playExplosionSound();
              setShake(true);
              newLives = 0;
              fruit.sliced = true;
              fruit.sliceTime = time;
              nextParticles.push({ id: fruit.id + '-p', x: fruit.x, y: fruit.y, createdAt: time, sliceAngle, type: fruit.type });
            } else {
              newScore += 10;
              fruit.sliced = true;
              fruit.sliceTime = time;
              fruit.sliceAngle = sliceAngle;
              fruit.vx *= 0.5; // Dampen horizontal movement slightly on impact
              nextFruits.push(fruit); // Keep for slice animation 
              nextParticles.push({ id: fruit.id + '-p', x: fruit.x, y: fruit.y, createdAt: time, sliceAngle, type: fruit.type });
              playSquishSound();
            }
          } else if (fruit.y > window.innerHeight + 100 && fruit.vy > 0 && fruit.type !== 'bomb') {
            // Missed fruit (but missed bombs are OK)
            newLives -= 1;
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

      if (newScore !== gameData.current.score) {
        gameData.current.score = newScore;
        setScore(newScore);
      }
      
      if (newLives !== gameData.current.lives) {
        gameData.current.lives = newLives;
        setLives(Math.max(0, newLives));
        if (newLives <= 0) {
           setGameState('gameover');
        }
      }

      setFruits([...nextFruits]);
      setParticles([...nextParticles]);

      if (gameState === 'playing' && newLives > 0) {
        requestAnimationFrame(gameLoop);
      }
    };

    let rafId;
    if (gameState === 'playing' && lives > 0) {
      rafId = requestAnimationFrame(gameLoop);
    }
    
    return () => cancelAnimationFrame(rafId);
  }, [gameState]); // Restart loop when gameState changes

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setTimeLeft(30);
    setFruits([]);
    setParticles([]);
    setBladePoints([]);
    gameData.current = { fruits: [], bladePoints: [], particles: [], score: 0, lives: 3 };
    setInitials('');
    setShake(false);
    setGameState('start');
  };

  return (
    <div 
      className={shake ? 'shake-active' : ''}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      onPointerMove={handleMouseMove} // Fallback mouse control
    >
      <WebcamFeed ref={videoRef} />
      <HandTracker videoRef={videoRef} onBladeMove={handleBladeMove} />
      <Scene3D fruits={fruits} bladePoints={bladePoints} particles={particles} />
      <HUD score={score} lives={lives} timeLeft={timeLeft} />
      
      {gameState === 'start' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          padding: '3rem',
          borderRadius: '24px',
          textAlign: 'center',
          zIndex: 20
        }}>
          <h1>Better Fruit Ninja</h1>
          <p style={{ fontSize: '20px', marginBottom: '2rem' }}>
            Hold your hand up to the camera until your cyan trail appears.
            <br />Enter your initials to begin!
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="text" 
              maxLength={3} 
              value={initials} 
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              placeholder="AAA"
              style={{ fontSize: '24px', width: '80px', textAlign: 'center', textTransform: 'uppercase', padding: '0.5rem', borderRadius: '8px', border: '2px solid white', background: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </div>

          <button 
            disabled={!initials}
            onClick={() => setGameState('playing')}
            style={{ 
              padding: '1rem 3rem', 
              fontSize: '24px', 
              cursor: initials ? 'pointer' : 'not-allowed',
              background: initials ? '#ff5252' : '#555',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: initials ? '0 4px 15px rgba(255, 82, 82, 0.4)' : 'none',
              marginBottom: '1rem'
            }}
          >
            Start Game
          </button>

          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>
            <h2>🏆 LEADERBOARD</h2>
            {leaderboard.map((entry, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', width: '200px', margin: '0 auto', fontSize: '20px' }}>
                <span>{entry.name}</span>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '2rem 4rem',
          borderRadius: '16px',
          textAlign: 'center',
          zIndex: 20
        }}>
          <h1>GAME OVER</h1>
          <p style={{ fontSize: '24px', marginBottom: '1rem' }}>Final Score: {score}</p>
          <p style={{ color: 'yellow', fontSize: '18px' }}>Score automatically saved for {initials || 'Anon'}!</p>
          
          <button 
            onClick={resetGame}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '20px', 
              cursor: 'pointer',
              background: '#4CAF50',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              marginTop: '1rem'
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
