import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SliceBurst({ particles }) {
  // A simplified burst rendering
  // particles is an array of objects: { id, x, y, burstAt }
  
  // To keep it simple, we don't animate complex particles in React state,
  // we just show a flash or use react-three-fiber logic.
  
  return (
    <group>
      {particles.map(p => (
        <BurstEffect key={p.id} x={p.x} y={p.y} />
      ))}
    </group>
  );
}

function BurstEffect({ x, y }) {
  const meshRef = useRef();
  const materialRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.x += delta * 100;
      meshRef.current.scale.y += delta * 100;
      
      if (materialRef.current && materialRef.current.opacity > 0) {
        materialRef.current.opacity -= delta * 2;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[x, y, -1]}>
      <circleGeometry args={[20, 16]} />
      <meshBasicMaterial ref={materialRef} color="white" transparent opacity={1} />
    </mesh>
  );
}
