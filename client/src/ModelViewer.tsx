import React, { useState, useRef } from 'react';
import { Vector3, StandardMaterial, MeshBuilder, Scene } from '@babylonjs/core';
import axios from 'axios';
import { Color3 } from '@babylonjs/core';
import { GLTF2Export } from '@babylonjs/serializers';
import { processGLBToVoxels, Coordinate } from './VoxelProcessor';
import { initializeAllScenes, SceneCanvasPair } from './SceneInitializer';

const ModelViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [voxelCoordinates, setVoxelCoordinates] = useState<Coordinate[]>([]);
  const [meshCoordinates, setMeshCoordinates] = useState<Coordinate[]>([]);

  const modelSceneCanvas: SceneCanvasPair = { canvasRef: useRef<HTMLCanvasElement>(null), sceneRef: useRef<Scene | null>(null), engine: null };
  const voxelSceneCanvas: SceneCanvasPair = { canvasRef: useRef<HTMLCanvasElement>(null), sceneRef: useRef<Scene | null>(null), engine: null };
  const meshSceneCanvas: SceneCanvasPair = { canvasRef: useRef<HTMLCanvasElement>(null), sceneRef: useRef<Scene | null>(null), engine: null };

  const connectServer = () => {
    axios.get('http://localhost:8080/')
      .then(response => setMessage(response.data))
      .catch(error => console.error('Error fetching message:', error));
  };

  const exportGLB = (sceneCanvas: SceneCanvasPair, fileName: string) => {
    const { sceneRef } = sceneCanvas;
    if (sceneRef.current) {
      GLTF2Export.GLBAsync(sceneRef.current, fileName)
        .then(glb => glb.downloadFiles())
        .catch(error => console.error(`Error exporting ${fileName}:`, error));
    }
  };

  const generateMeshData = () => {
    if (modelSceneCanvas.sceneRef.current) {
      const voxelData = processGLBToVoxels(modelSceneCanvas.sceneRef.current, 10);
      setVoxelCoordinates(voxelData);

      axios.post('http://localhost:8080/upload', voxelData)
        .then(response => setMeshCoordinates(response.data))
        .catch(error => console.error('Error sending voxel data:', error));
    }
  };

  const displayVoxels = (sceneCanvas: SceneCanvasPair, coordinates: Coordinate[], color: Color3) => {
    const { sceneRef } = sceneCanvas;
    if (!sceneRef.current) return;

    coordinates.forEach(coord => {
      const voxel = MeshBuilder.CreateBox('voxel', { size: 0.1 }, sceneRef.current!);
      voxel.position = new Vector3(coord.x, coord.y, coord.z);

      const voxelMaterial = new StandardMaterial('voxelMaterial', sceneRef.current!);
      voxelMaterial.diffuseColor = color;
      voxel.material = voxelMaterial;
    });
  };

  const displayVoxelAndMeshData = () => {
    displayVoxels(voxelSceneCanvas, voxelCoordinates, new Color3(1, 0, 0));
    displayVoxels(meshSceneCanvas, meshCoordinates, new Color3(0, 0, 1));
  };

  return (
    <>
      <h1>マーチングキューブ法の研究</h1>
      <h3>サーバ：{message || '未接続'}</h3>
      <button onClick={connectServer}>サーバへの接続確認</button>
      <button onClick={() => initializeAllScenes(modelSceneCanvas, voxelSceneCanvas, meshSceneCanvas, 'guitar.glb')}>シーンの起動</button>
      <button onClick={() => { generateMeshData(); connectServer(); displayVoxelAndMeshData(); }}>データの送信と実行</button>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h2>元の画像</h2>
          <canvas ref={modelSceneCanvas.canvasRef} style={{ width: '300px', height: '300px', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(modelSceneCanvas, 'model.glb')}>Export Model</button>
        </div>
        <div>
          <h2>ボクセル画像</h2>
          <canvas ref={voxelSceneCanvas.canvasRef} style={{ width: '300px', height: '300px', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(voxelSceneCanvas, 'voxel.glb')}>Export Voxel</button>
          <h3>ボクセル座標（上位50件まで）</h3>
          <ul>
            {voxelCoordinates.slice(0, 50).map((coord, index) => (
              <li key={index}>{`x: ${coord.x.toFixed(2)}, y: ${coord.y.toFixed(2)}, z: ${coord.z.toFixed(2)}`}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>メッシュ画像</h2>
          <canvas ref={meshSceneCanvas.canvasRef} style={{ width: '300px', height: '300px', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(meshSceneCanvas, 'mesh.glb')}>Export Mesh</button>
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

export default ModelViewer;
