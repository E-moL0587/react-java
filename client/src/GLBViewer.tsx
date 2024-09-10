import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, SceneLoader, Color4 } from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState(''); // サーバーからのメッセージを表示
  const [serverData, setServerData] = useState<any>(null); // サーバーからのデータを管理するためのstate
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    // サーバーから初期メッセージを取得
    axios.get('http://localhost:8080/')
      .then(response => setMessage(response.data))
      .catch(error => console.error('Error fetching message:', error));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    // GLBファイルをシーンに読み込む
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

  const exportGLB = () => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, 'model.glb').then((glb: { downloadFiles: () => void }) => {
        glb.downloadFiles();
      });
    }
  };

  // モデルをサーバーに送信し、サーバーからデータを受け取る
  const sendModelToServer = () => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, 'model.glb').then((glb) => {
        const modelBlob = Object.values(glb.glTFFiles).find(
          (file) => file instanceof Blob
        ) as Blob;

        if (modelBlob) {
          const formData = new FormData();
          formData.append('file', modelBlob, 'model.glb');

          axios
            .post('http://localhost:8080/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            })
            .then(response => {
              alert('Model uploaded successfully!');
              setServerData(response.data); // サーバーからのデータをセット
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
      <canvas ref={canvasRef} style={{ width: '400px', height: '400px' }} />
      <br />
      <button onClick={exportGLB}>Export Model</button>
      <button onClick={sendModelToServer}>Send to Server</button>

      {serverData && (
        <div>
          <h2>Server Data:</h2>
          <ul>
            {serverData.map((point: { x: number; y: number; z: number }, index: number) => (
              <li key={index}>
                X: {point.x.toFixed(5)}, Y: {point.y.toFixed(5)}, Z: {point.z.toFixed(5)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default GLBViewer;
