import React, { useEffect, useState } from 'react';

export function StatusMessage({ message, icon }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message || !isVisible) return null;

  return (
    <div
      className="retro-font"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '3px solid #00ffff',
        color: '#00ffff',
        padding: '20px 30px',
        fontSize: '24px',
        textShadow: '2px 2px 0px rgba(0, 255, 255, 0.5)',
        zIndex: 100,
        pointerEvents: 'none',
        animation: 'fadeInOut 2.5s ease-in-out',
        whiteSpace: 'nowrap'
      }}
    >
      {icon} {message}
    </div>
  );
}
