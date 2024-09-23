import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Color4,
  StandardMaterial,
  Color3,
  Ray,
  PickingInfo,
  SolidParticleSystem,
  MeshBuilder,
  SceneLoader,
  SolidParticle,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const modelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const voxelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);

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

    const scene = new Scene(engine);
    const voxelScene = new Scene(voxelEngine);
    sceneRef.current = scene;

    scene.clearColor = new Color4(1, 0.9, 1, 1);
    voxelScene.clearColor = new Color4(0.9, 0.9, 1, 1);

    const camera = new ArcRotateCamera('camera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 12, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.panningSensibility = 0;
    camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;

    const voxelCamera = new ArcRotateCamera('voxelCamera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 12, Vector3.Zero(), voxelScene);
    voxelCamera.attachControl(voxelCanvas, true);
    voxelCamera.panningSensibility = 0;
    voxelCamera.lowerRadiusLimit = voxelCamera.upperRadiusLimit = voxelCamera.radius;

    const light = new HemisphericLight('light', new Vector3(1, 1, 0), scene);
    light.intensity = 10;

    const voxelLight = new HemisphericLight('voxelLight', new Vector3(1, 1, 0), voxelScene);
    voxelLight.intensity = 10;

    SceneLoader.Append('', 'guitar.glb', scene, () => {
      let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
      let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

      scene.meshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        const boundingInfo = mesh.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;
        min = Vector3.Minimize(min, boundingBox.minimumWorld);
        max = Vector3.Maximize(max, boundingBox.maximumWorld);
      });

      const boxSize = max.subtract(min);
      const minSize = Math.min(boxSize.x, boxSize.y, boxSize.z);
      const cellSize = minSize / 40;

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
              const pickInfo: PickingInfo | null = scene.pickWithRay(new Ray(cellCenter, direction), mesh => mesh.isVisible);
              return pickInfo && pickInfo.hit;
            });

            if (hitInAllDirections) intersectedCells.add(`${x}-${y}-${z}`);
          }
        }
      }

      intersectedCells.forEach(cell => {
        const [x, y, z] = cell.split('-').map(Number);
        const cellMin = new Vector3(min.x + x * cellSize, min.y + y * cellSize, min.z + z * cellSize);
        const cellCenter = cellMin.add(new Vector3(cellSize / 2, cellSize / 2, cellSize / 2));
        sps.addShape(voxelTemplate, 1, { positionFunction: (particle: SolidParticle) => {
          particle.position = cellCenter;
        }});
      });

      const voxelMesh = sps.buildMesh();
      (voxelMesh.material as StandardMaterial).diffuseColor = new Color3(1, 0, 0);

      voxelTemplate.dispose();
    }, undefined, (message, exception) => console.error('Failed to load model:', message, exception));

    engine.runRenderLoop(() => scene.render());
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

  const exportGLB = () => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, 'model.glb').then(glb => {
        glb.downloadFiles();
      });
    }
  };

  return (
    <>
      <h1>{message || 'Loading...'}</h1>
      <canvas ref={modelCanvasRef} style={{ width: '300px', height: '300px' }} />
      <canvas ref={voxelCanvasRef} style={{ width: '300px', height: '300px' }} />
      <br />
      <button onClick={exportGLB}>Export Model</button>
    </>
  );
};

export default GLBViewer;
