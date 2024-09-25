import React, { useState, useRef } from 'react';
import { Vector3, StandardMaterial, MeshBuilder, Scene, Color3 } from '@babylonjs/core';
import axios from 'axios';
import { GLTF2Export } from '@babylonjs/serializers';
import { resizeGLB } from './ResizeProcessor';
import { processGLBToVoxels, Coordinate } from './VoxelProcessor';
import { initializeAllScenes, SceneCanvasPair, resetScene } from './SceneInitializer';

const ModelViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [voxelCoordinates, setVoxelCoordinates] = useState<Coordinate[]>([]);
  const [meshCoordinates, setMeshCoordinates] = useState<Coordinate[]>([]);
  const [resolution, setResolution] = useState(10);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      const voxelData = processGLBToVoxels(modelSceneCanvas.sceneRef.current, resolution);
      setVoxelCoordinates(voxelData);

      axios.post('http://localhost:8080/upload', voxelData)
        .then(response => setMeshCoordinates(response.data))
        .catch(error => console.error('Error sending voxel data:', error));
    }
  };

  const calculateVoxelSize = (coordinates: Coordinate[], resolution: number) => {
    const maxX = Math.max(...coordinates.map(coord => coord.x));
    const minX = Math.min(...coordinates.map(coord => coord.x));
    const maxY = Math.max(...coordinates.map(coord => coord.y));
    const minY = Math.min(...coordinates.map(coord => coord.y));
    const maxZ = Math.max(...coordinates.map(coord => coord.z));
    const minZ = Math.min(...coordinates.map(coord => coord.z));

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;

    const sizeX = rangeX / resolution;
    const sizeY = rangeY / resolution;
    const sizeZ = rangeZ / resolution;

    return Math.min(sizeX, sizeY, sizeZ);
  };

  const displayVoxels = (sceneCanvas: SceneCanvasPair, coordinates: Coordinate[], color: Color3, resolution: number) => {
    const { sceneRef } = sceneCanvas;
    if (!sceneRef.current) return;

    const voxelSize = calculateVoxelSize(coordinates, resolution);

    const baseVoxel = MeshBuilder.CreateBox('voxel', { size: voxelSize }, sceneRef.current!);
    baseVoxel.isVisible = false;

    const voxelMaterial = new StandardMaterial('voxelMaterial', sceneRef.current!);
    voxelMaterial.diffuseColor = color;
    voxelMaterial.alpha = 0.3;
    baseVoxel.material = voxelMaterial;

    coordinates.forEach((coord, index) => {
      const voxelInstance = baseVoxel.createInstance(`voxelInstance${index}`);
      voxelInstance.position = new Vector3(coord.x, coord.y, coord.z);
    });
  };

  const displayVoxelAndMeshData = () => {
    resetScene(voxelSceneCanvas);
    resetScene(meshSceneCanvas);

    displayVoxels(voxelSceneCanvas, voxelCoordinates, new Color3(1, 0, 0), resolution);
    displayVoxels(meshSceneCanvas, meshCoordinates, new Color3(0, 0, 1), resolution);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const initializeScenesWithFile = () => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const fileDataUrl = reader.result.toString();
          initializeAllScenes(modelSceneCanvas, voxelSceneCanvas, meshSceneCanvas, fileDataUrl);
        }
      };
      reader.readAsDataURL(selectedFile);
    } else {
      initializeAllScenes(modelSceneCanvas, voxelSceneCanvas, meshSceneCanvas, 'guitar.glb');
    }
  };

  const changeResolution = (change: number) => {
    setResolution(prev => Math.max(1, Math.min(prev + change, 50)));
  };

  const resizeModel = () => {
    if (modelSceneCanvas.sceneRef.current) {
      resizeGLB(modelSceneCanvas.sceneRef.current);
    }
  };

  return (
    <>
      <h1>マーチングキューブ法の研究</h1>
      <h2>開発環境</h2>
      <p>
        フロントエンド側：JavaScript (TypeScript)<br />
        バックエンド側：Java (SpringBoot)<br />
        通信：Rest API
      </p>
      <h2>設定</h2>
      <p>サーバ：{message || '未接続'}</p>
      <p>
        解像度：
        <button onClick={() => changeResolution(-1)}>－</button>
        {resolution}
        <button onClick={() => changeResolution(1)}>＋</button>
      </p>
      <input type="file" accept=".glb" onChange={handleFileChange} />
      <br />
      <button onClick={connectServer}>サーバ接続の確認</button>
      <button onClick={initializeScenesWithFile}>起動</button>
      <button onClick={resizeModel}>位置の自動調整</button>
      <button onClick={() => { generateMeshData(); connectServer(); }}>ビルド</button>
      <button onClick={displayVoxelAndMeshData}>実行</button>

      <div style={{ display: 'flex', gap: '10px' }}>
        <div>
          <h2>モデル画像</h2>
          <canvas ref={modelSceneCanvas.canvasRef} style={{ width: '30vw', height: '30vw', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(modelSceneCanvas, 'model.glb')}>モデルのファイル出力</button>
        </div>
        <div>
          <h2>ボクセル画像</h2>
          <canvas ref={voxelSceneCanvas.canvasRef} style={{ width: '30vw', height: '30vw', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(voxelSceneCanvas, 'voxel.glb')}>ボクセルのファイル出力</button>
          <h4>ボクセルの座標（50件）</h4>
          <>
            {voxelCoordinates.slice(0, 50).map((coord, index) => (
              <div key={index}>{`(${coord.x.toFixed(2)}, ${coord.y.toFixed(2)}, ${coord.z.toFixed(2)})`}<br /></div>
            ))}
          </>
        </div>
        <div>
          <h2>メッシュ画像</h2>
          <canvas ref={meshSceneCanvas.canvasRef} style={{ width: '30vw', height: '30vw', border: '1px solid black' }} />
          <br />
          <button onClick={() => exportGLB(meshSceneCanvas, 'mesh.glb')}>メッシュのファイル出力</button>
          <h4>メッシュの座標（50件）</h4>
          <>
            {meshCoordinates.slice(0, 50).map((coord, index) => (
              <div key={index}>{`(${coord.x.toFixed(2)}, ${coord.y.toFixed(2)}, ${coord.z.toFixed(2)})`}<br /></div>
            ))}
          </>
        </div>
      </div>
    </>
  );
};

export default ModelViewer;
