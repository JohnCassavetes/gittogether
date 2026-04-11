import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { mapToScreen } from '../utils/mapLandmarks';

export function HandTracker({ videoRef, onBladeMove }) {
  const landmarkerRef = useRef(null);
  const trailingP1 = useRef([]);
  const trailingP2 = useRef([]);

  useEffect(() => {
    async function initModel() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
      console.log("HandLandmarker loaded");
    }
    initModel();

    let animationFrameId;
    let lastVideoTime = -1;

    function detectFrame() {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && landmarkerRef.current) {
        const startTimeMs = performance.now();
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          
          const detections = landmarkerRef.current.detectForVideo(video, startTimeMs);
          
          if (detections.landmarks && detections.landmarks.length > 0) {
            const screenPoints = detections.landmarks.map(hand => mapToScreen(hand[8]));
            
            // Sort conceptually: left-most point (lowest X) maps to P1, right-most to P2
            screenPoints.sort((a,b) => a.x - b.x);

            // Update P1 Trail
            if (screenPoints.length > 0) {
              trailingP1.current.push(screenPoints[0]);
              if (trailingP1.current.length > 10) trailingP1.current.shift();
            }
            
            // Update P2 Trail
            if (screenPoints.length > 1) {
              trailingP2.current.push(screenPoints[1]);
              if (trailingP2.current.length > 10) trailingP2.current.shift();
            } else if (trailingP2.current.length > 0) {
              trailingP2.current.shift();
            }

          } else {
            // No hands detected, gradually clear both trails
            if (trailingP1.current.length > 0) trailingP1.current.shift();
            if (trailingP2.current.length > 0) trailingP2.current.shift();
          }

          onBladeMove({ 
            p1: [...trailingP1.current], 
            p2: [...trailingP2.current] 
          });
        }
      }
      animationFrameId = requestAnimationFrame(detectFrame);
    }
    
    detectFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, [videoRef, onBladeMove]);

  return null; // Logic-only component
}
