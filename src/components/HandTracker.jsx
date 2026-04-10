import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { mapToScreen } from '../utils/mapLandmarks';

export function HandTracker({ videoRef, onBladeMove }) {
  const landmarkerRef = useRef(null);
  const trailingPoints = useRef([]);

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
        numHands: 1
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
            // Index finger tip is landmark 8
            const indexTip = detections.landmarks[0][8];
            const screenPoint = mapToScreen(indexTip);
            
            trailingPoints.current.push(screenPoint);
            if (trailingPoints.current.length > 10) {
              trailingPoints.current.shift();
            }
            onBladeMove([...trailingPoints.current]);
          } else {
            // Gradually clear trail if no hand
            if (trailingPoints.current.length > 0) {
              trailingPoints.current.shift();
              onBladeMove([...trailingPoints.current]);
            }
          }
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
