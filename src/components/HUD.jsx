import React from 'react';

export function HUD({ score, lives, timeLeft }) {
  return (
    <div className="retro-font" style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      color: '#fff',
      fontSize: '24px',
      textShadow: '4px 4px 0px rgba(0,0,0,1)',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <div>Score: {score}</div>
      <div>Time: {Math.max(0, Math.ceil(timeLeft))}</div>
      <div>Lives: {'❤️'.repeat(lives)}</div>
    </div>
  );
}
