import React, { forwardRef, useEffect } from 'react';

export const WebcamFeed = forwardRef((props, ref) => {
  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false
        });
        if (ref.current) {
          ref.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Webcam error:", err);
      }
    }
    start();
  }, [ref]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)', // Mirror video
        zIndex: 0
      }}
    />
  );
});
