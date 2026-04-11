import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Fruit } from './Fruit';
import { BladeTrail } from './BladeTrail';
import { SliceBurst } from './SliceBurst';

export function Scene3D({ fruits, bladePointsP1, bladePointsP2, particles, playerMode }) {
  const headPointP1 = bladePointsP1?.length > 0 ? bladePointsP1[bladePointsP1.length - 1] : null;
  const headPointP2 = bladePointsP2?.length > 0 ? bladePointsP2[bladePointsP2.length - 1] : null;

  // Single player view for all modes (split-screen removed)
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, 100]}
        left={0}
        right={window.innerWidth}
        top={0}
        bottom={window.innerHeight}
        near={0.1}
        far={1000}
      />

      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 10]} intensity={2} />

      {/* Player blade lights */}
      {headPointP1 && <pointLight position={[headPointP1.x, headPointP1.y, 100]} intensity={200000} color="#00ffff" />}
      {headPointP2 && playerMode !== 'network' && <pointLight position={[headPointP2.x, headPointP2.y, 100]} intensity={200000} color="#ff00ff" />}

      {fruits.map((f) => (
        <Fruit key={f.id} {...f} />
      ))}

      <BladeTrail points={bladePointsP1} color="#00ffff" />
      {playerMode !== 'network' && <BladeTrail points={bladePointsP2} color="#ff00ff" />}

      <SliceBurst particles={particles} />
    </Canvas>
  );
}
