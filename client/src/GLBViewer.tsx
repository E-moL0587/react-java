import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4, StandardMaterial, Color3, Ray, PickingInfo, SolidParticleSystem, MeshBuilder, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const modelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const voxelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelSceneRef = useRef<Scene | null>(null);
  const voxelSceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    axios.get('http://localhost:8080/')
      .then(response => setMessage(response.data))
      .catch(error => console.error('Error fetching message:', error));
  }, []);

  // キャンバスとシーン設定
  const initializeScene = (canvas: HTMLCanvasElement, clearColor: Color4, sceneRef: React.MutableRefObject<Scene | null>, isVoxelScene: boolean) => {
    const engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    sceneRef.current = scene;

    scene.clearColor = clearColor;

    const camera = new ArcRotateCamera('camera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 12, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.panningSensibility = 0;
    camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;

    const light = new HemisphericLight('light', new Vector3(1, 1, 0), scene);
    light.intensity = 10;

    if (isVoxelScene && modelSceneRef.current) {
      camera.onViewMatrixChangedObservable.add(() => syncCameras(camera, modelSceneRef.current!.activeCamera as ArcRotateCamera));
      modelSceneRef.current!.activeCamera!.onViewMatrixChangedObservable.add(() => syncCameras(modelSceneRef.current!.activeCamera as ArcRotateCamera, camera));
    }

    return engine;
  };

  // カメラの同期
  const syncCameras = (sourceCamera: ArcRotateCamera, targetCamera: ArcRotateCamera) => {
    targetCamera.alpha = sourceCamera.alpha;
    targetCamera.beta = sourceCamera.beta;
    targetCamera.radius = sourceCamera.radius;
    targetCamera.target = sourceCamera.target.clone();
  };

  // GLBエクスポート機能
  const exportGLB = (sceneRef: React.MutableRefObject<Scene | null>, fileName: string) => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, fileName)
        .then(glb => glb.downloadFiles())
        .catch(error => console.error(`Error exporting ${fileName}:`, error));
    }
  };

  useEffect(() => {
    const modelCanvas = modelCanvasRef.current;
    const voxelCanvas = voxelCanvasRef.current;
    if (!modelCanvas || !voxelCanvas) return;

    const modelEngine = initializeScene(modelCanvas, new Color4(1, 0.9, 1, 1), modelSceneRef, false);
    const voxelEngine = initializeScene(voxelCanvas, new Color4(0.9, 0.9, 1, 1), voxelSceneRef, true);

    SceneLoader.Append('', 'guitar.glb', modelSceneRef.current!, () => {
      let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
      let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

      modelSceneRef.current!.meshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        const boundingInfo = mesh.getBoundingInfo();
        min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
        max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
      });

      const boxSize = max.subtract(min);
      const minSize = Math.min(boxSize.x, boxSize.y, boxSize.z);
      const cellSize = minSize / 10;

      const sps = new SolidParticleSystem('sps', voxelSceneRef.current!);
      const voxelTemplate = MeshBuilder.CreateBox('box', { size: cellSize }, voxelSceneRef.current!);

      const intersectedCells = new Set<string>();
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
              const pickInfo: PickingInfo | null = modelSceneRef.current!.pickWithRay(ray, mesh => mesh.isVisible);
              return pickInfo?.hit;
            });

            if (hitInAllDirections) intersectedCells.add(`${x}-${y}-${z}`);
          }
        }
      }

      intersectedCells.forEach(cell => {
        const [x, y, z] = cell.split('-').map(Number);
        const cellMin = new Vector3(min.x + x * cellSize, min.y + y * cellSize, min.z + z * cellSize);
        const cellCenter = cellMin.add(new Vector3(cellSize / 2, cellSize / 2, cellSize / 2));
        sps.addShape(voxelTemplate, 1, {
          positionFunction: (particle: { position: Vector3 }) => {
            particle.position = cellCenter;
          }
        });
      });

      const voxelMesh = sps.buildMesh();
      const voxelMaterial = new StandardMaterial('voxelMaterial', voxelSceneRef.current!);
      voxelMaterial.diffuseColor = new Color3(0, 0, 1);
      voxelMesh.material = voxelMaterial;

      voxelTemplate.dispose();
    }, undefined, (message, exception) => console.error('Failed to load model:', message, exception));

    modelEngine.runRenderLoop(() => modelSceneRef.current?.render());
    voxelEngine.runRenderLoop(() => voxelSceneRef.current?.render());

    window.addEventListener('resize', () => {
      modelEngine.resize();
      voxelEngine.resize();
    });

    return () => {
      modelEngine.dispose();
      voxelEngine.dispose();
    };
  }, []);

  return (
    <>
      <h1>{message || 'Loading...'}</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <canvas
            ref={modelCanvasRef}
            style={{ width: '600px', height: '600px', border: '1px solid black' }}
          />
          <br />
          <button onClick={() => exportGLB(modelSceneRef, 'model.glb')}>Export Model</button>
        </div>
        <div>
          <canvas
            ref={voxelCanvasRef}
            style={{ width: '600px', height: '600px', border: '1px solid black' }}
          />
          <br />
          <button onClick={() => exportGLB(voxelSceneRef, 'voxel.glb')}>Export Voxel</button>
        </div>
      </div>
    </>
  );
};

export default GLBViewer;
