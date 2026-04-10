import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebcamFeed } from '../components/WebcamFeed';
import { HandTracker } from '../components/HandTracker';
import { Scene3D } from '../components/Scene3D';
import { HUD } from '../components/HUD';
import { segmentHitsCircle } from '../utils/collision';
import { spawnFruit } from '../utils/spawnFruit';
import { updateFruit } from '../utils/fruitMotion';

export function GameScreen() {
  const [fruits, setFruits] = useState([]);
  const [particles, setParticles] = useState([]);
  const [bladePoints, setBladePoints] = useState([]);
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  
  const videoRef = useRef(null);
  const fruitIdCounter = useRef(0);
  
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

  const handleBladeMove = useCallback((points) => {
    setBladePoints(points);
  }, []);

  const handleMouseMove = useCallback((e) => {
    setBladePoints(prev => {
      const newPoints = [...prev, { x: e.clientX, y: e.clientY }];
      if (newPoints.length > 10) newPoints.shift();
      return newPoints;
    });
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    let spawnTimer = 0;

    const gameLoop = (time) => {
      if (gameData.current.lives <= 0 || gameOver) return;

      const dt = time - lastTime;
      lastTime = time;

      // Update Time
      setTimeLeft(prev => {
        const nextTime = Math.max(0, prev - dt / 1000);
        if (nextTime === 0) setGameOver(true);
        return nextTime;
      });

      // Spawn Fruits
      spawnTimer += dt;
      if (spawnTimer > 1500) {
        spawnTimer = 0;
        const newFruit = spawnFruit(fruitIdCounter.current++);
        gameData.current.fruits.push(newFruit);
      }

      // Physics & Collision
      const currentBlade = gameData.current.bladePoints;
      let newScore = gameData.current.score;
      let newLives = gameData.current.lives;

      const nextFruits = [];
      const nextParticles = gameData.current.particles.filter(p => time - p.createdAt < 500); // 500ms lifespan

      for (const fruit of gameData.current.fruits) {
        if (!fruit.sliced) {
          updateFruit(fruit);

          // Check collision with blade
          let sliced = false;
          for (let i = 0; i < currentBlade.length - 1; i++) {
            if (segmentHitsCircle(currentBlade[i], currentBlade[i+1], fruit)) {
              sliced = true;
              break;
            }
          }

          if (sliced) {
            newScore += 10;
            nextParticles.push({ id: fruit.id + '-p', x: fruit.x, y: fruit.y, createdAt: time });
          } else if (fruit.y > window.innerHeight + 100 && fruit.vy > 0) {
            // Missed fruit
            newLives -= 1;
          } else {
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
        if (newLives <= 0) setGameOver(true);
      }

      setFruits([...nextFruits]);
      setParticles([...nextParticles]);

      if (!gameOver && newLives > 0) {
        requestAnimationFrame(gameLoop);
      }
    };

    let rafId;
    if (!gameOver && lives > 0) {
      rafId = requestAnimationFrame(gameLoop);
    }
    
    return () => cancelAnimationFrame(rafId);
  }, [gameOver]); // minimal dependencies so loop doesn't restart continuously

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setTimeLeft(30);
    setFruits([]);
    setParticles([]);
    setBladePoints([]);
    gameData.current = { fruits: [], bladePoints: [], particles: [], score: 0, lives: 3 };
    setGameOver(false);
  };

  return (
    <div 
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      onPointerMove={handleMouseMove} // Fallback mouse control
    >
      <WebcamFeed ref={videoRef} />
      <HandTracker videoRef={videoRef} onBladeMove={handleBladeMove} />
      <Scene3D fruits={fruits} bladePoints={bladePoints} particles={particles} />
      <HUD score={score} lives={lives} timeLeft={timeLeft} />
      
      {gameOver && (
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
          <p style={{ fontSize: '24px' }}>Final Score: {score}</p>
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
