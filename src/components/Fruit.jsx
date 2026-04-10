import React from 'react';

export function Fruit({ x, y, radius, sliced, type }) {
  if (sliced) return null;

  let color = 'orange';
  if (type === 'apple') color = 'red';
  if (type === 'lemon') color = 'yellow';

  return (
    <mesh position={[x, y, 0]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}
