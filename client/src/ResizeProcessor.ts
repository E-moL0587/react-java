import { Scene, Vector3, Mesh, TransformNode } from '@babylonjs/core';

export const resizeGLB = (glbScene: Scene): Scene => {
  let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

  // 全てのメッシュのバウンディングボックスをチェックして、最小・最大の座標を取得
  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      const boundingInfo = mesh.getBoundingInfo();
      min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
      max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
    }
  });

  const boxSize = max.subtract(min);
  const currentSize = Math.max(boxSize.x, boxSize.y, boxSize.z);

  // 中心をXとZ軸に関してはminとmaxの中間、Y軸に関してはminのY位置に合わせる
  const center = new Vector3(
    (min.x + max.x) / 2,  // X軸の中心
    min.y,                // Y軸の最小値（底辺）
    (min.z + max.z) / 2   // Z軸の中心
  );

  const canvasSize = 8;  // キャンバスに合わせるサイズ
  const scale = canvasSize / currentSize;

  // ルートノードを作成し、全メッシュを親に設定
  const rootNode = new TransformNode("rootNode", glbScene);
  glbScene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      mesh.setParent(rootNode);
    }
  });

  // モデルの位置を調整（Y軸は下に揃え、X軸・Z軸は中央に揃える）
  rootNode.position = center.negate();  // 中心を(0, 0, 0)に移動
  rootNode.scaling.scaleInPlace(scale); // スケールを調整

  return glbScene;
};
