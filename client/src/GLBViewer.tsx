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

  useEffect(() => {
    const canvas = modelCanvasRef.current;
    const voxelCanvas = voxelCanvasRef.current;
    if (!canvas || !voxelCanvas) return;

    const engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
    const voxelEngine = new Engine(voxelCanvas, true, { antialias: true, adaptToDeviceRatio: true });

    const modelScene = new Scene(engine);
    const voxelScene = new Scene(voxelEngine);
    modelSceneRef.current = modelScene;
    voxelSceneRef.current = voxelScene;

    modelScene.clearColor = new Color4(1, 0.9, 1, 1);
    voxelScene.clearColor = new Color4(0.9, 0.9, 1, 1);

    const modelCamera = new ArcRotateCamera('modelCamera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 12, Vector3.Zero(), modelScene);
    modelCamera.attachControl(canvas, true);
    modelCamera.panningSensibility = 0;
    modelCamera.lowerRadiusLimit = modelCamera.upperRadiusLimit = modelCamera.radius;

    const voxelCamera = new ArcRotateCamera('voxelCamera', modelCamera.alpha, modelCamera.beta, modelCamera.radius, modelCamera.target.clone(), voxelScene);
    voxelCamera.attachControl(voxelCanvas, true);
    voxelCamera.panningSensibility = 0;
    voxelCamera.lowerRadiusLimit = voxelCamera.upperRadiusLimit = voxelCamera.radius;

    const modelLight = new HemisphericLight('modelLight', new Vector3(1, 1, 0), modelScene);
    modelLight.intensity = 10;

    const voxelLight = new HemisphericLight('voxelLight', new Vector3(1, 1, 0), voxelScene);
    voxelLight.intensity = 10;

    modelCamera.onViewMatrixChangedObservable.add(() => {
      voxelCamera.alpha = modelCamera.alpha;
      voxelCamera.beta = modelCamera.beta;
      voxelCamera.radius = modelCamera.radius;
      voxelCamera.target = modelCamera.target.clone();
    });

    voxelCamera.onViewMatrixChangedObservable.add(() => {
      modelCamera.alpha = voxelCamera.alpha;
      modelCamera.beta = voxelCamera.beta;
      modelCamera.radius = voxelCamera.radius;
      modelCamera.target = voxelCamera.target.clone();
    });

    SceneLoader.Append('', 'guitar.glb', modelScene, () => {
      let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
      let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

      modelScene.meshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        const boundingInfo = mesh.getBoundingInfo();
        min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
        max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
      });

      const boxSize = max.subtract(min);
      const minSize = Math.min(boxSize.x, boxSize.y, boxSize.z);
      const cellSize = minSize / 10;

      const sps = new SolidParticleSystem('sps', voxelScene);
      const voxelTemplate = MeshBuilder.CreateBox('box', { size: cellSize }, voxelScene);

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
              new Vector3(0, 0, -1),
            ];

            const hitInAllDirections = directions.every(direction => {
              const ray = new Ray(cellCenter, direction, 1000);
              const pickInfo: PickingInfo | null = modelScene.pickWithRay(ray, mesh => mesh.isVisible);
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
      const voxelMaterial = new StandardMaterial('voxelMaterial', voxelScene);
      voxelMaterial.diffuseColor = new Color3(0, 0, 1);
      voxelMesh.material = voxelMaterial;

      voxelTemplate.dispose();
    }, undefined, (message, exception) => console.error('Failed to load model:', message, exception));

    engine.runRenderLoop(() => modelScene.render());
    voxelEngine.runRenderLoop(() => voxelScene.render());

    window.addEventListener('resize', () => {
      engine.resize();
      voxelEngine.resize();
    });

    return () => {
      engine.dispose();
      voxelEngine.dispose();
    };
  }, []);

  const exportModelGLB = () => {
    if (modelSceneRef.current) {
      GLTF2Export.GLBAsync(modelSceneRef.current, 'model.glb')
        .then(glb => glb.downloadFiles())
        .catch(error => console.error('Error exporting model GLB:', error));
    }
  };

  const exportVoxelGLB = () => {
    if (voxelSceneRef.current) {
      GLTF2Export.GLBAsync(voxelSceneRef.current, 'voxel.glb')
        .then(glb => glb.downloadFiles())
        .catch(error => console.error('Error exporting voxel GLB:', error));
    }
  };

  return (
    <>
      <h1>{message || 'Loading...'}</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <canvas
            ref={modelCanvasRef}
            style={{ width: '300px', height: '300px', border: '1px solid black' }}
          />
          <br />
          <button onClick={exportModelGLB}>Export Model</button>
        </div>
        <div>
          <canvas
            ref={voxelCanvasRef}
            style={{ width: '300px', height: '300px', border: '1px solid black' }}
          />
          <br />
          <button onClick={exportVoxelGLB}>Export Voxel</button>
        </div>
      </div>
    </>
  );
};

export default GLBViewer;
