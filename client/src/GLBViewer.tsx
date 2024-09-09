import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, SceneLoader, Color4 } from '@babylonjs/core';
import '@babylonjs/loaders';
import { GLTF2Export } from '@babylonjs/serializers';

const GLBViewer: React.FC = () => {
  const [message, setMessage] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
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

  return (
    <>
      <h1>{message || 'Loading...'}</h1>
      <canvas ref={canvasRef} style={{ width: '400px', height: '400px' }} />
      <br />
      <button onClick={exportGLB}>Export Model</button>
    </>
  );
};

export default GLBViewer;
