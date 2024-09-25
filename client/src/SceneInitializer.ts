import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4, SceneLoader, Mesh, TransformNode } from '@babylonjs/core';
import '@babylonjs/loaders';

export interface SceneCanvasPair {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<Scene | null>;
  engine: Engine | null;
}

export const initializeScene = (sceneCanvas: SceneCanvasPair, clearColor: Color4) => {
  const { canvasRef, sceneRef } = sceneCanvas;
  const canvas = canvasRef.current;
  if (!canvas) return;

  const engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
  const scene = new Scene(engine);
  scene.clearColor = clearColor;
  sceneRef.current = scene;

  const camera = new ArcRotateCamera('camera', Math.PI / 2 + 0.3, Math.PI / 4 + 0.6, 12, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.panningSensibility = 0;
  camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;

  const light = new HemisphericLight('light', new Vector3(1, 1, 0), scene);
  light.intensity = 10;

  sceneCanvas.engine = engine;
};

export const initializeAllScenes = (
  modelSceneCanvas: SceneCanvasPair, 
  voxelSceneCanvas: SceneCanvasPair, 
  meshSceneCanvas: SceneCanvasPair, 
  glbFilePath: string
) => {
  initializeScene(modelSceneCanvas, new Color4(1, 0.9, 1, 1));
  initializeScene(voxelSceneCanvas, new Color4(1, 0.8, 1, 1));
  initializeScene(meshSceneCanvas, new Color4(1, 0.7, 1, 1));

  SceneLoader.Append('', glbFilePath, modelSceneCanvas.sceneRef.current!, (scene) => {
    adjustModelCenterY(scene);
  }, undefined, (message, exception) => {
    console.error('Failed to load model:', message, exception);
  });

  modelSceneCanvas.engine?.runRenderLoop(() => modelSceneCanvas.sceneRef.current?.render());
  voxelSceneCanvas.engine?.runRenderLoop(() => voxelSceneCanvas.sceneRef.current?.render());
  meshSceneCanvas.engine?.runRenderLoop(() => meshSceneCanvas.sceneRef.current?.render());

  window.addEventListener('resize', () => {
    modelSceneCanvas.engine?.resize();
    voxelSceneCanvas.engine?.resize();
    meshSceneCanvas.engine?.resize();
  });
};

const adjustModelCenterY = (scene: Scene) => {
  let minY = Number.MAX_VALUE;
  let maxY = -Number.MAX_VALUE;

  const rootNode = new TransformNode("rootNode", scene);

  scene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      mesh.setParent(rootNode);
      const boundingInfo = mesh.getBoundingInfo();
      const min = boundingInfo.boundingBox.minimumWorld;
      const max = boundingInfo.boundingBox.maximumWorld;

      if (min.y < minY) minY = min.y;
      if (max.y > maxY) maxY = max.y;
    }
  });

  const centerY = (minY + maxY) / 2;

  rootNode.position.y -= centerY;
};
