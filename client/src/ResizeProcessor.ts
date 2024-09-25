import { Scene, Vector3, Mesh, TransformNode } from '@babylonjs/core';

export const resizeGLB = (glbScene: Scene, targetSize: number): Scene => {
  let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

  // Calculate the bounding box of the model by finding the min/max coordinates
  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      const boundingInfo = mesh.getBoundingInfo();
      min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
      max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
    }
  });

  // Determine the current size of the model
  const boxSize = max.subtract(min);
  const currentSize = Math.max(boxSize.x, boxSize.y, boxSize.z);

  // Calculate the scale factor to resize the entire model
  const scale = targetSize / currentSize;

  // Create a parent node to hold all meshes
  const rootNode = new TransformNode("rootNode", glbScene);

  // Attach all meshes to the root node
  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      mesh.setParent(rootNode);
    }
  });

  // Apply scaling to the root node to resize the entire model
  rootNode.scaling.scaleInPlace(scale);

  return glbScene;
};
