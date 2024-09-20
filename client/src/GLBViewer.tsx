import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, SceneLoader, Color4, PointsCloudSystem, SolidParticle } from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [serverData, setServerData] = useState<any>(null);
  const modelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const voxelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const voxelSceneRef = useRef<Scene | null>(null);

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
      () => console.log('Model loaded successfully'),
      undefined,
      (message) => console.error('Failed to load model:', message)
    );

    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);

    engine.runRenderLoop(() => scene.render());

    window.addEventListener('resize', () => engine.resize());

    return () => engine.dispose();
  }, []);

  // ボクセルシーンの初期化（点群）
  useEffect(() => {
    if (!serverData || !voxelCanvasRef.current) return;

    const engine = new Engine(voxelCanvasRef.current, true, { antialias: true, adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    voxelSceneRef.current = scene;

    const camera = new ArcRotateCamera('voxelCamera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 10, Vector3.Zero(), scene);
    camera.attachControl(voxelCanvasRef.current, true);

    const light = new HemisphericLight('voxelLight', new Vector3(1, 1, 0), scene);
    light.intensity = 0.8;

    // 点群システムを作成
    const pcs = new PointsCloudSystem('pcs', 1, scene);

    // 各ボクセルを点として追加
    serverData.forEach((point: { x: number; y: number; z: number }) => {
      pcs.addPoints(1, (particle: SolidParticle) => {
        particle.position.x = point.x;
        particle.position.y = point.y;
        particle.position.z = point.z;
      });
    });

    // 点群の構築とレンダリング
    pcs.buildMeshAsync().then(() => {
      engine.runRenderLoop(() => scene.render());
    });

    window.addEventListener('resize', () => engine.resize());

    return () => engine.dispose();
  }, [serverData]);

  const exportGLB = () => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, 'model.glb').then((glb: { downloadFiles: () => void }) => {
        glb.downloadFiles();
      });
    }
  };

  const sendModelToServer = () => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, 'model.glb').then((glb) => {
        const modelBlob = new Blob(Object.values(glb.glTFFiles), { type: 'model/gltf-binary' });

        if (modelBlob) {
          const formData = new FormData();
          formData.append('file', modelBlob, 'model.glb');
          formData.append('voxelSize', '0.1');

          axios
            .post('http://localhost:8080/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            })
            .then(response => {
              alert('Model uploaded successfully!');
              setServerData(response.data);
            })
            .catch((error) => console.error('Error uploading model:', error));
        } else {
          console.error('No valid Blob found in the exported GLTF files.');
        }
      });
    }
  };

  return (
    <>
      <h1>{message || 'Loading...'}</h1>

      <canvas ref={modelCanvasRef} style={{ width: '400px', height: '400px' }} />

      {serverData && (
        <>
          <h2>Voxel Model:</h2>
          <canvas ref={voxelCanvasRef} style={{ width: '400px', height: '400px' }} />
        </>
      )}

      <br />
      <button onClick={exportGLB}>Export Model</button>
      <button onClick={sendModelToServer}>Send to Server</button>

      {serverData && (
        <div>
          <h2>Voxel Data:</h2>
          <ul>
            {serverData.slice(0, 100).map((point: { x: number; y: number; z: number }, index: number) => (
              <li key={index}>
                {point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default GLBViewer;
