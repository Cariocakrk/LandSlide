import * as THREE from 'three';

/**
 * Standard projection from Lat/Lng to Three.js world coordinates (10x10 grid)
 * Linear approximation valid for local city-scale maps.
 */
export function convertLatLngToWorld(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  gridWidth: number = 10
) {
  // 1 degree latitude is approximately 111,000 meters
  const latRatio = (lat - centerLat) * 111000;
  
  // 1 degree longitude depends on the latitude
  const lonRatio = (lon - centerLon) * 111000 * Math.cos(centerLat * (Math.PI / 180));
  
  // Map scale: assume the 10x10 three.js grid represents a 1600m x 1600m area
  const scale = gridWidth / 1600; 
  
  return {
    x: lonRatio * scale,
    z: -latRatio * scale 
  };
}

/**
 * Get terrain height at specific world X, Z coordinates based on elevation matrix.
 * This should mirror the deformation applied in TerrainMesh.tsx.
 */
export function getTerrainHeight(
  x: number,
  z: number,
  matrix: number[][] | null,
  gridSize: number = 10,
  heightScale: number = 0.05
): number {
  if (!matrix || matrix.length === 0) return 0;
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  
  // Geometry is PlaneGeometry(gridSize, gridSize, cols-1, rows-1)
  // Indices c, r to X, Z:
  // x = (c - (cols-1)/2) * (gridSize / (cols-1))
  // z = -(r - (rows-1)/2) * (gridSize / (rows-1))
  
  const c = Math.round((x / (gridSize / (cols - 1))) + (cols - 1) / 2);
  const r = Math.round((-z / (gridSize / (rows - 1))) + (rows - 1) / 2);
  
  // Bound check
  const ri = Math.max(0, Math.min(rows - 1, r));
  const ci = Math.max(0, Math.min(cols - 1, c));
  
  return (matrix[ri]?.[ci] || 0) * heightScale;
}

/**
 * Align an object to the terrain normal at a given point using Raycasting.
 * More accurate than getTerrainHeight for steep slopes.
 */
export function anchorToTerrainRaycast(
  x: number,
  z: number,
  terrainMesh: THREE.Mesh,
  sensorHeight: number = 0.3
): THREE.Vector3 | null {
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3(x, 100, z); // High up
  const direction = new THREE.Vector3(0, -1, 0); // Down
  
  raycaster.set(origin, direction);
  const intersects = raycaster.intersectObject(terrainMesh);
  
  if (intersects.length > 0) {
    const intersect = intersects[0];
    const point = intersect.point.clone();
    
    if (intersect.face) {
      const normal = intersect.face.normal.clone();
      normal.transformDirection(terrainMesh.matrixWorld);
      point.add(normal.multiplyScalar(sensorHeight / 2));
    } else {
      point.y += sensorHeight / 2;
    }
    return point;
  }
  return null;
}

/**
 * Ensures coordinate order for different libraries (Leaflet/Mapbox vs Turf/custom)
 * Standardizes on [lat, lng] for internal representation.
 */
export function ensureLatLng(coords: number[] | { lat: number, lng: number }): [number, number] {
  if (Array.isArray(coords)) {
     if (coords.length === 2) {
        // Simple heuristic: lat is usually -90 to 90
        if (coords[0]! > 90 || coords[0]! < -90) {
           // Probably [lng, lat]
           return [coords[1]!, coords[0]!];
        }
        return [coords[0]!, coords[1]!];
     }
  } else if (coords.lat !== undefined && coords.lng !== undefined) {
    return [coords.lat, coords.lng];
  }
  return [0, 0];
}
