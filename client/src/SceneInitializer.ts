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

  new HemisphericLight('light', new Vector3(1, 1, 0), scene).intensity = 10;
  sceneCanvas.engine = engine;
};

export const initializeAllScenes = (
  modelSceneCanvas: SceneCanvasPair, 
  voxelSceneCanvas: SceneCanvasPair, 
  meshSceneCanvas: SceneCanvasPair, 
  glbFilePath: string
) => {
  [modelSceneCanvas, voxelSceneCanvas, meshSceneCanvas].forEach((canvas, i) => {
    initializeScene(canvas, new Color4(1, 0.9 - i * 0.1, 1, 1));
  });

  const synchronizeCameras = () => {
    const cameras = [
      modelSceneCanvas.sceneRef.current!.activeCamera,
      voxelSceneCanvas.sceneRef.current!.activeCamera,
      meshSceneCanvas.sceneRef.current!.activeCamera
    ] as ArcRotateCamera[];

    cameras.forEach((camera, index) => {
      camera.onViewMatrixChangedObservable.add(() => {
        cameras.forEach((otherCamera, i) => {
          if (i !== index) {
            otherCamera.alpha = camera.alpha;
            otherCamera.beta = camera.beta;
            otherCamera.radius = camera.radius;
          }
        });
      });
    });
  };

  SceneLoader.Append('', glbFilePath, modelSceneCanvas.sceneRef.current!, () => {
    adjustModelCenterY(modelSceneCanvas.sceneRef.current!);
    synchronizeCameras();
  });

  [modelSceneCanvas, voxelSceneCanvas, meshSceneCanvas].forEach((canvas) => {
    canvas.engine?.runRenderLoop(() => canvas.sceneRef.current?.render());
  });

  window.addEventListener('resize', () => {
    [modelSceneCanvas, voxelSceneCanvas, meshSceneCanvas].forEach((canvas) => {
      canvas.engine?.resize();
    });
  });
};

const adjustModelCenterY = (scene: Scene) => {
  let minY = Number.MAX_VALUE, maxY = -Number.MAX_VALUE;

  const rootNode = new TransformNode("rootNode", scene);
  scene.meshes.forEach((mesh) => {
    if (mesh instanceof Mesh) {
      mesh.setParent(rootNode);
      const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
      minY = Math.min(minY, min.y);
      maxY = Math.max(maxY, max.y);
    }
  });

  rootNode.position.y -= (minY + maxY) / 2;
};
