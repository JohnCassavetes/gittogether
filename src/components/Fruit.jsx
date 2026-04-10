import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export function Fruit({ x, y, radius, sliced, type, sliceAngle }) {
  const groupRef = useRef();
  const leftHalfRef = useRef();
  const rightHalfRef = useRef();

  useEffect(() => {
     if (sliced && groupRef.current && sliceAngle !== undefined) {
        groupRef.current.rotation.set(0, 0, sliceAngle + Math.PI / 2);
     }
  }, [sliced, sliceAngle]);

  useFrame((state, delta) => {
    if (groupRef.current && !sliced) {
      groupRef.current.rotation.x += delta * 3;
      groupRef.current.rotation.y += delta * 2;
    }
    
    if (sliced && leftHalfRef.current && rightHalfRef.current) {
      // Animate halves flying apart perpendicularly out from the slice angle!
      leftHalfRef.current.position.x -= delta * 250;
      leftHalfRef.current.rotation.z += delta * 15;
      
      rightHalfRef.current.position.x += delta * 250;
      rightHalfRef.current.rotation.z -= delta * 15;
    }
  });

  return (
    <group ref={groupRef} position={[x, y, 0]}>
      {type === 'apple' && <AppleModel radius={radius} leftRef={leftHalfRef} rightRef={rightHalfRef} />}
      {type === 'melon' && <MelonModel radius={radius} leftRef={leftHalfRef} rightRef={rightHalfRef} />}
      {type === 'banana' && <BananaModel radius={radius} leftRef={leftHalfRef} rightRef={rightHalfRef} />}
      {type === 'bomb' && <BombModel radius={radius} leftRef={leftHalfRef} rightRef={rightHalfRef} />}
    </group>
  );
}

function AppleModel({ radius, leftRef, rightRef }) {
  return (
    <>
      <group ref={leftRef}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <sphereGeometry args={[radius, 32, 32, 0, Math.PI]} />
          <meshStandardMaterial color="#b21807" roughness={0.4} />
        </mesh>
        {/* Inner Flesh */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[radius, 32]} />
          <meshStandardMaterial color="#fffdd0" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightRef}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <sphereGeometry args={[radius, 32, 32, 0, Math.PI]} />
          <meshStandardMaterial color="#b21807" roughness={0.4} />
        </mesh>
        {/* Inner Flesh */}
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[radius, 32]} />
          <meshStandardMaterial color="#fffdd0" roughness={0.7} />
        </mesh>
        {/* Apple Stem */}
        <mesh position={[0, radius * 0.95, 0]}>
          <cylinderGeometry args={[radius * 0.05, radius * 0.08, radius * 0.4]} />
          <meshStandardMaterial color="#4a2f1d" />
        </mesh>
        {/* Apple Leaf */}
        <mesh position={[radius * 0.2, radius * 1.1, 0]} rotation={[0, 0, Math.PI / 4]}>
          <sphereGeometry args={[radius * 0.3, 16, 16]} />
          <meshStandardMaterial color="#228b22" />
        </mesh>
      </group>
    </>
  );
}

function MelonModel({ radius, leftRef, rightRef }) {
  return (
    <>
      <group ref={leftRef}>
        <group scale={[1.2, 1, 1.2]}>
          {/* Outer Skin */}
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <sphereGeometry args={[radius, 32, 32, 0, Math.PI]} />
            <meshStandardMaterial color="#1e5928" roughness={0.7} />
          </mesh>
          {/* Inner Flesh */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[radius, 32]} />
            <meshStandardMaterial color="#ff3333" roughness={0.6} />
          </mesh>
          {/* Seeds */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={`lseed-${i}`} position={[(Math.random() - 0.5) * radius * 1.3, (Math.random() - 0.5) * radius * 1.3, 0.5]} rotation={[0, Math.PI / 2, 0]}>
               <sphereGeometry args={[radius * 0.04, 8, 8]} />
               <meshBasicMaterial color="#111" />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={rightRef}>
        <group scale={[1.2, 1, 1.2]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <sphereGeometry args={[radius, 32, 32, 0, Math.PI]} />
            <meshStandardMaterial color="#1e5928" roughness={0.7} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[radius, 32]} />
            <meshStandardMaterial color="#ff3333" roughness={0.6} />
          </mesh>
          {/* Seeds */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={`rseed-${i}`} position={[(Math.random() - 0.5) * radius * 1.3, (Math.random() - 0.5) * radius * 1.3, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
               <sphereGeometry args={[radius * 0.04, 8, 8]} />
               <meshBasicMaterial color="#111" />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}

function BananaModel({ radius, leftRef, rightRef }) {
  return (
    <>
      <group ref={leftRef}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          {/* Slightly thicker banana */}
          <torusGeometry args={[radius, radius * 0.35, 16, 32, Math.PI * 0.4]} />
          <meshStandardMaterial color="#ffd700" roughness={0.4} />
        </mesh>
        {/* Banana Brown Tip */}
        <mesh position={[radius * 0.65, radius * 0.65, 0]}>
          <sphereGeometry args={[radius * 0.15, 8, 8]} />
          <meshStandardMaterial color="#302013" />
        </mesh>
      </group>
      <group ref={rightRef}>
        <mesh rotation={[0, 0, Math.PI / 4 + Math.PI * 0.4]}>
          <torusGeometry args={[radius, radius * 0.35, 16, 32, Math.PI * 0.4]} />
          <meshStandardMaterial color="#ffd700" roughness={0.4} />
        </mesh>
        {/* Banana Stem Tip */}
        <mesh position={[-radius * 0.85, radius * 0.15, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <cylinderGeometry args={[radius * 0.1, radius * 0.15, radius * 0.4]} />
          <meshStandardMaterial color="#4a3b2c" />
        </mesh>
      </group>
    </>
  );
}

function BombModel({ radius, leftRef, rightRef }) {
  const fireGroupRef = useRef();
  
  useFrame((state, delta) => {
     if (fireGroupRef.current) {
        // rapid flickering and rotating
        fireGroupRef.current.rotation.z += delta * 15;
        fireGroupRef.current.children.forEach((child, index) => {
           // Create a chaotic shaking/scaling effect for the flames
           child.scale.x = 0.8 + Math.random() * 0.6;
           child.scale.y = 0.8 + Math.random() * 0.6;
        });
     }
  });

  return (
    <>
      <group ref={leftRef}>
        <mesh>
          <sphereGeometry args={[radius, 16, 16, 0, Math.PI]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
      <group ref={rightRef}>
        <mesh>
          <sphereGeometry args={[radius, 16, 16, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, radius, 0]}>
          <cylinderGeometry args={[4, 4, 30]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
        
        {/* LARGE INTENSE 3D FIRE on top of the bomb so it's unmistakable from all angles */}
        <group ref={fireGroupRef} position={[0, radius + 25, 0]}>
           {/* Red Outer Burst */}
           <mesh>
             <icosahedronGeometry args={[40, 1]} />
             <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
           </mesh>
           {/* Orange Mid Burst */}
           <mesh>
             <icosahedronGeometry args={[30, 0]} />
             <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
           </mesh>
           {/* Yellow Core */}
           <mesh>
             <icosahedronGeometry args={[20, 0]} />
             <meshBasicMaterial color="#ffff00" transparent opacity={1} />
           </mesh>
        </group>
      </group>
    </>
  );
}
