import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Fruit } from './Fruit';
import { BladeTrail } from './BladeTrail';
import { SliceBurst } from './SliceBurst';

export function Scene3D({ fruits, bladePointsP1, bladePointsP2, particles, splatters }) {
  const headPointP1 = bladePointsP1?.length > 0 ? bladePointsP1[bladePointsP1.length - 1] : null;
  const headPointP2 = bladePointsP2?.length > 0 ? bladePointsP2[bladePointsP2.length - 1] : null;

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
      
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 10]} intensity={2} />
      
      {/* Dynamic tracking point lights - Increased intensity to be seen over ambient */}
      {headPointP1 && <pointLight position={[headPointP1.x, headPointP1.y, 100]} intensity={200000} color="#00ffff" />}
      {headPointP2 && <pointLight position={[headPointP2.x, headPointP2.y, 100]} intensity={200000} color="#ff00ff" />}

      {fruits.map((f) => (
        <Fruit key={f.id} {...f} />
      ))}

      <BladeTrail points={bladePointsP1} color="#00ffff" />
      <BladeTrail points={bladePointsP2} color="#ff00ff" />
      
      <SliceBurst particles={particles} />
    </Canvas>
  );
}
