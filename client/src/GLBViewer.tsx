import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  Color4,
  StandardMaterial,
  MeshBuilder,
  Color3,
  Ray,
  PickingInfo
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const modelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    axios.get('http://localhost:8080/')
      .then(response => setMessage(response.data))
      .catch(error => console.error('Error fetching message:', error));
  }, []);

  useEffect(() => {
    const canvas = modelCanvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    sceneRef.current = scene;

    scene.clearColor = new Color4(1, 0.9, 1, 1);

    const camera = new ArcRotateCamera('camera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 12, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.panningSensibility = 0;
    camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;

    const light = new HemisphericLight('light', new Vector3(1, 1, 0), scene);
    light.intensity = 10;

    SceneLoader.Append(
      '',
      'guitar.glb',
      scene,
      (scene) => {
        console.log('Model loaded successfully');

        // モデルの最大最小座標を取得し、BoundingBoxを作成
        let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

        scene.meshes.forEach((mesh) => {
          mesh.computeWorldMatrix(true);
          const boundingInfo = mesh.getBoundingInfo();
          const boundingBox = boundingInfo.boundingBox;

          min = Vector3.Minimize(min, boundingBox.minimumWorld);
          max = Vector3.Maximize(max, boundingBox.maximumWorld);
        });

        // ボックスを作成
        const boxSize = max.subtract(min);

        // 赤いマテリアルを設定
        const redMaterial = new StandardMaterial('redMaterial', scene);
        redMaterial.diffuseColor = new Color3(1, 0, 0); // 赤

        // 最も小さい軸に基づいてセルサイズを計算
        const minSize = Math.min(boxSize.x, boxSize.y, boxSize.z);
        const cellSize = minSize / 40; // 10セル分割

        // グリッドを描画（中心点がメッシュ内にあるセルのみ描画）
        const drawGrid = () => {
          const intersectedCells = new Set<string>(); // 交差するグリッドセルを保存するセット

          for (let x = 0; x <= Math.ceil(boxSize.x / cellSize); x++) {
            for (let y = 0; y <= Math.ceil(boxSize.y / cellSize); y++) {
              for (let z = 0; z <= Math.ceil(boxSize.z / cellSize); z++) {
                const cellMin = new Vector3(
                  min.x + x * cellSize,
                  min.y + y * cellSize,
                  min.z + z * cellSize
                );
                const cellCenter = cellMin.add(new Vector3(cellSize / 2, cellSize / 2, cellSize / 2));

                // 各方向のRayを発射
                const directions = [
                  new Vector3(0, 1, 0),   // 上
                  new Vector3(0, -1, 0),  // 下
                  new Vector3(1, 0, 0),   // 右
                  new Vector3(-1, 0, 0),  // 左
                  new Vector3(0, 0, 1),   // 前
                  new Vector3(0, 0, -1)   // 後
                ];

                const hitInAllDirections = directions.every(direction => {
                  const pickInfo: PickingInfo | null = scene.pickWithRay(
                    new Ray(cellCenter, direction),
                    (mesh) => mesh.isVisible
                  );
                  return pickInfo && pickInfo.hit;
                });

                // すべての方向でヒットした場合
                if (hitInAllDirections) {
                  intersectedCells.add(`${x}-${y}-${z}`);
                }
              }
            }
          }

          // 交差しているセルのみを描画
          intersectedCells.forEach((cell) => {
            const [x, y, z] = cell.split('-').map(Number);
            const cellMin = new Vector3(
              min.x + x * cellSize,
              min.y + y * cellSize,
              min.z + z * cellSize
            );
            const cellCenter = cellMin.add(new Vector3(cellSize / 2, cellSize / 2, cellSize / 2));
            const gridCell = MeshBuilder.CreateBox(`gridCell_${x}_${y}_${z}`, { size: cellSize }, scene);
            gridCell.position = cellCenter; // セルの中央に配置
            gridCell.material = redMaterial; // 赤いマテリアルを適用
          });
        };

        drawGrid(); // グリッドの描画
      },
      undefined,
      (message) => console.error('Failed to load model:', message)
    );

    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);

    engine.runRenderLoop(() => scene.render());

    window.addEventListener('resize', () => engine.resize());

    return () => engine.dispose();
  }, []);

  const exportGLB = () => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, 'model.glb').then((glb: { downloadFiles: () => void }) => {
        glb.downloadFiles();
      });
    }
  };

  return (
    <>
      <h1>{message || 'Loading...'}</h1>

      <canvas ref={modelCanvasRef} style={{ width: '400px', height: '400px' }} />

      <br />
      <button onClick={exportGLB}>Export Model</button>
    </>
  );
};

export default GLBViewer;
