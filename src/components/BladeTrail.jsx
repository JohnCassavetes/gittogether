import React from 'react';
import { Line } from '@react-three/drei';

export function BladeTrail({ points, color = "cyan" }) {
  if (points.length < 2) return null;

  // Convert objects to arrays for Line component
  const linePoints = points.map(p => [p.x, p.y, 0]);

  return (
    <Line
      points={linePoints}    // Array of points [ [x,y,z], ... ]
      color={color}           // Color of the line
      lineWidth={15}         // Now we can use thick lines!
      transparent
      opacity={0.8}
    />
  );
}
