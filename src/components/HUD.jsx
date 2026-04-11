import React from 'react';

export function HUD({ scoreP1, scoreP2, lives, timeLeft, playerMode }) {
  return (
    <>
      {/* Player Score - Top Left */}
      <div className="retro-font" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: '#00ffff',
        fontSize: '24px',
        textShadow: '4px 4px 0px rgba(0,0,0,1)',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        <div>SCORE: {scoreP1}</div>
        {playerMode === '1P' && <div>LIVES: {'❤️'.repeat(lives)}</div>}
      </div>

      {/* Timer - Top Center */}
      <div className="retro-font" style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        fontSize: '32px',
        textShadow: '4px 4px 0px rgba(0,0,0,1)',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        TIME: {Math.max(0, Math.ceil(timeLeft))}
      </div>
    </>
  );
}
