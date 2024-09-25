import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';
import { processGLBToVoxels, Coordinate } from './VoxelProcessor';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [voxelCoordinates, setVoxelCoordinates] = useState<Coordinate[]>([]);
  const [meshCoordinates, setMeshCoordinates] = useState<Coordinate[]>([]);
  const modelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const voxelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelSceneRef = useRef<Scene | null>(null);
  const voxelSceneRef = useRef<Scene | null>(null);
  const meshSceneRef = useRef<Scene | null>(null);

  const connectServer = () => {
    axios.get('http://localhost:8080/')
      .then(response => setMessage(response.data))
      .catch(error => console.error('Error fetching message:', error));
  };

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

    return engine;
  };

  const exportGLB = (sceneRef: React.MutableRefObject<Scene | null>, fileName: string) => {
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, fileName)
        .then(glb => glb.downloadFiles())
        .catch(error => console.error(`Error exporting ${fileName}:`, error));
    }
  };

  const generateMeshData = () => {
    if (modelSceneRef.current) {
      const voxelData = processGLBToVoxels(modelSceneRef.current);
      setVoxelCoordinates(voxelData);

      axios.post('http://localhost:8080/upload', voxelData)
        .then(response => setMeshCoordinates(response.data))
        .catch(error => console.error('Error sending voxel data:', error));
    }
  };

  const initializeAllScenes = () => {
    const modelCanvas = modelCanvasRef.current;
    const voxelCanvas = voxelCanvasRef.current;
    const meshCanvas = meshCanvasRef.current;
    if (!modelCanvas || !voxelCanvas || !meshCanvas) return;

    const modelEngine = initializeScene(modelCanvas, new Color4(1, 0.9, 1, 1), modelSceneRef, false);
    const voxelEngine = initializeScene(voxelCanvas, new Color4(1, 0.8, 1, 1), voxelSceneRef, true);
    const meshEngine = initializeScene(meshCanvas, new Color4(1, 0.7, 1, 1), meshSceneRef, false);

    SceneLoader.Append('', 'guitar.glb', modelSceneRef.current!, undefined, undefined, (message, exception) => {
      console.error('Failed to load model:', message, exception);
    });

    modelEngine.runRenderLoop(() => modelSceneRef.current?.render());
    voxelEngine.runRenderLoop(() => voxelSceneRef.current?.render());
    meshEngine.runRenderLoop(() => meshSceneRef.current?.render());

    window.addEventListener('resize', () => {
      modelEngine.resize();
      voxelEngine.resize();
      meshEngine.resize();
    });
  };

  return (
    <>
      <h1>マーチングキューブ法の研究</h1>
      <h3>サーバ：{message || '未接続'}</h3>
      <button onClick={connectServer}>サーバへの接続確認</button>
      <button onClick={initializeAllScenes}>シーンの起動</button>
      <button onClick={() => { generateMeshData(); connectServer(); }}>データの送信</button>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h2>元の画像</h2>
          <canvas ref={modelCanvasRef} style={{ width: '300px', height: '300px', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(modelSceneRef, 'model.glb')}>Export Model</button>
        </div>
        <div>
          <h2>ボクセル画像</h2>
          <canvas ref={voxelCanvasRef} style={{ width: '300px', height: '300px', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(voxelSceneRef, 'voxel.glb')}>Export Voxel</button>
          <h3>ボクセル座標（上位50件まで）</h3>
          <ul>
            {voxelCoordinates.slice(0, 50).map((coord, index) => (
              <li key={index}>{`x: ${coord.x.toFixed(2)}, y: ${coord.y.toFixed(2)}, z: ${coord.z.toFixed(2)}`}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>メッシュ画像</h2>
          <canvas ref={meshCanvasRef} style={{ width: '300px', height: '300px', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(meshSceneRef, 'mesh.glb')}>Export Mesh</button>
          <h3>メッシュ座標（上位50件まで）</h3>
          <ul>
            {meshCoordinates.slice(0, 50).map((coord, index) => (
              <li key={index}>{`x: ${coord.x.toFixed(2)}, y: ${coord.y.toFixed(2)}, z: ${coord.z.toFixed(2)}`}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default GLBViewer;
