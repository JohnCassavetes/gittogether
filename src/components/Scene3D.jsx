import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Fruit } from './Fruit';
import { BladeTrail } from './BladeTrail';
import { SliceBurst } from './SliceBurst';

export function Scene3D({ fruits, bladePoints, particles }) {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none' // Let clicks pass through if needed for mouse fallback
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
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />

      {fruits.map((f) => (
        <Fruit key={f.id} {...f} />
      ))}

      <BladeTrail points={bladePoints} />
      
      <SliceBurst particles={particles} />
    </Canvas>
  );
}
