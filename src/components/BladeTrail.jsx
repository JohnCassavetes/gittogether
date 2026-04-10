import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

export function BladeTrail({ points }) {
  const lineRef = useRef();
  
  useLayoutEffect(() => {
    if (lineRef.current) {
      const positions = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i++) {
        // Transform screen coords to 3D coords based on orthographic camera setup
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = 0;
      }
      lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [points]);

  if (points.length < 2) return null;

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="cyan" linewidth={5} />
    </line>
  );
}
