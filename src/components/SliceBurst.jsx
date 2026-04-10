import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function SliceBurst({ particles }) {
  return (
    <group>
      {particles.map(p => (
        <BurstEffect key={p.id} x={p.x} y={p.y} sliceAngle={p.sliceAngle || 0} type={p.type} />
      ))}
    </group>
  );
}

function BurstEffect({ x, y, sliceAngle, type }) {
  const meshRef = useRef();
  const lineRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.x += delta * 150;
      meshRef.current.scale.y += delta * 150;
      if (meshRef.current.material.opacity > 0) {
        meshRef.current.material.opacity -= delta * 3;
      }
    }
    if (lineRef.current) {
      // Rapid horizontal expansion for that sharp anime-slash look
      lineRef.current.scale.x += delta * 600; 
      lineRef.current.scale.y += delta * 10; 
      if (lineRef.current.material.opacity > 0) {
        lineRef.current.material.opacity -= delta * 5;
      }
    }
  });

  let color = '#ffeb3b';
  if (type === 'apple') color = '#ff4d4d';
  if (type === 'melon') color = '#99ff99';
  
  if (type === 'bomb') {
    return <FireExplosion x={x} y={y} />;
  }

  return (
    <group position={[x, y, -1]}>
      {/* Background Juice Splash */}
      <mesh ref={meshRef}>
        <circleGeometry args={[10, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Sharp Slice Flash Line */}
      <mesh ref={lineRef} rotation={[0, 0, sliceAngle]} position={[0, 0, 1]}>
        <planeGeometry args={[10, 2]} />
        <meshBasicMaterial color="white" transparent opacity={1} />
      </mesh>
    </group>
  );
}

function FireExplosion({ x, y }) {
   // Generate physics particles for fire and embers
   const particles = useRef(
     Array.from({ length: 50 }).map(() => ({
       x: 0, 
       y: 0,
       vx: (Math.random() - 0.5) * 1200, // Fast initial burst
       vy: (Math.random() - 0.5) * 1200 + 300, // Bias upwards a bit
       gravity: -1500, // Strong gravity pull for falling debris effect
       life: 0.5 + Math.random() * 0.8, // Lives between 0.5s and 1.3s
       maxLife: 1.3,
       scale: 1 + Math.random() * 3, // Random sizes
       color: ['#fffc00', '#ff9900', '#ff3300', '#990000', '#ffffff'][Math.floor(Math.random()*5)]
     }))
   );
   
   const groupRef = useRef();

   useFrame((state, delta) => {
      if (groupRef.current) {
         let children = groupRef.current.children;
         for (let i = 0; i < children.length; i++) {
            const p = particles.current[i];
            if (p.life > 0) {
               p.life -= delta;
               p.vy += p.gravity * delta; // Apply gravity
               
               // Apply drag
               p.vx *= 0.92;
               p.vy *= (p.vy > 0 ? 0.92 : 0.98); // Less drag when falling 
               
               p.x += p.vx * delta;
               p.y += p.vy * delta;
               
               children[i].position.set(p.x, p.y, 0);
               
               // Scale down as life decreases
               const currentScale = Math.max(0, p.scale * (p.life / p.maxLife) * 12);
               children[i].scale.set(currentScale, currentScale, 1);
               // Fade out
               children[i].material.opacity = Math.max(0, p.life / p.maxLife);
            } else {
               children[i].scale.set(0, 0, 0); // Hide dead particles
            }
         }
      }
   });

   return (
      <group ref={groupRef} position={[x, y, 10]}>
         {particles.current.map((p, i) => (
            <mesh key={i}>
               <circleGeometry args={[1, 16]} />
               <meshBasicMaterial color={p.color} transparent opacity={1} />
            </mesh>
         ))}
      </group>
   );
}
