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
  const center = min.add(max).scale(0.5);

  const canvasSize = 7;
  const scale = canvasSize / currentSize;

  const rootNode = new TransformNode("rootNode", glbScene);
  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      mesh.setParent(rootNode);
    }
  });

  rootNode.position = rootNode.position.subtract(center);
  rootNode.scaling.scaleInPlace(scale);

  return glbScene;
};
