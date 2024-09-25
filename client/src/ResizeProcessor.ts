import { Scene, Vector3, Mesh } from '@babylonjs/core';

export const resizeGLB = (glbScene: Scene): Scene => {
  let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

  // 最大最小の座標を取得
  glbScene.meshes.forEach(mesh => {
    if (mesh instanceof Mesh) {
      mesh.computeWorldMatrix(true);
      const boundingInfo = mesh.getBoundingInfo();
      min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
      max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
    }
  });

  const boxSize = max.subtract(min);
  const currentSize = Math.max(boxSize.x, boxSize.y, boxSize.z);

  // モデルを中央に配置するためのオフセット
  const centerOffset = min.add(boxSize.scale(0.5));

  // リサイズ係数の計算
  const scale = 2 / currentSize;

  // 全てのメッシュをリサイズ＆中央に配置
  glbScene.meshes.forEach(mesh => {
    if (mesh instanceof Mesh) {
      // 中央に配置するための移動
      mesh.position.subtractInPlace(centerOffset);
      // スケールを調整
      mesh.scaling.scaleInPlace(scale);
    }
  });

  return glbScene;
};
