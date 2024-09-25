import { Scene, Vector3, Mesh, TransformNode } from '@babylonjs/core';

export const resizeGLB = (glbScene: Scene): Scene => {
  let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      const boundingInfo = mesh.getBoundingInfo();
      min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
      max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
    }
  });

  const boxSize = max.subtract(min);
  const currentSize = Math.max(boxSize.x, boxSize.y, boxSize.z);

  const center = new Vector3(
    (min.x + max.x) / 2,
    min.y,
    (min.z + max.z) / 2
  );

  const canvasSize = 8;
  const scale = canvasSize / currentSize;

  const rootNode = new TransformNode("rootNode", glbScene);
  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      mesh.setParent(rootNode);
    }
  });

  rootNode.position = center.negate();
  rootNode.scaling.scaleInPlace(scale);

  return glbScene;
};
