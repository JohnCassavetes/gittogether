import React from 'react';

export function HUD({ score, lives, timeLeft }) {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      color: 'white',
      fontFamily: 'sans-serif',
      fontSize: '24px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <div>Score: {score}</div>
      <div>Time: {Math.max(0, Math.ceil(timeLeft))}</div>
      <div>Lives: {'❤️'.repeat(lives)}</div>
    </div>
  );
}
