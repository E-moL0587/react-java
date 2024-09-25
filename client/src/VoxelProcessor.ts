import { Scene, Vector3, Ray, PickingInfo } from '@babylonjs/core';

export interface Coordinate {
  x: number;
  y: number;
  z: number;
}

export const processGLBToVoxels = (glbScene: Scene): Coordinate[] => {
  let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

  glbScene.meshes.forEach(mesh => {
    mesh.computeWorldMatrix(true);
    const boundingInfo = mesh.getBoundingInfo();
    min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
    max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
  });

  const boxSize = max.subtract(min);
  const minSize = Math.min(boxSize.x, boxSize.y, boxSize.z);
  const cellSize = minSize / 10;

  const intersectedCells = new Set<string>();
  const newVoxelCoordinates: Coordinate[] = [];

  for (let x = 0; x <= Math.ceil(boxSize.x / cellSize); x++) {
    for (let y = 0; y <= Math.ceil(boxSize.y / cellSize); y++) {
      for (let z = 0; z <= Math.ceil(boxSize.z / cellSize); z++) {
        const cellMin = new Vector3(min.x + x * cellSize, min.y + y * cellSize, min.z + z * cellSize);
        const cellCenter = cellMin.add(new Vector3(cellSize / 2, cellSize / 2, cellSize / 2));

        const directions = [
          new Vector3(0, 1, 0),
          new Vector3(0, -1, 0),
          new Vector3(1, 0, 0),
          new Vector3(-1, 0, 0),
          new Vector3(0, 0, 1),
          new Vector3(0, 0, -1)
        ];

        const hitInAllDirections = directions.every(direction => {
          const ray = new Ray(cellCenter, direction, 1000);
          const pickInfo: PickingInfo | null = glbScene.pickWithRay(ray, mesh => mesh.isVisible);
          return pickInfo?.hit;
        });

        if (hitInAllDirections) {
          intersectedCells.add(`${x}-${y}-${z}`);
          newVoxelCoordinates.push({
            x: cellCenter.x,
            y: cellCenter.y,
            z: cellCenter.z
          });
        }
      }
    }
  }

  return newVoxelCoordinates;
};
