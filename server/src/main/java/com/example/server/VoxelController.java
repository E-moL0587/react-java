package com.example.server;

import java.io.File;
import java.io.IOException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import de.javagl.jgltf.model.GltfModel;
import de.javagl.jgltf.model.MeshModel;
import de.javagl.jgltf.model.NodeModel;
import de.javagl.jgltf.model.SceneModel;
import de.javagl.jgltf.model.io.GltfModelReader;

@RestController
public class VoxelController {

    @GetMapping("/")
    public String hello() {
        return "Hello world!";
    }

    private static final Logger logger = LoggerFactory.getLogger(VoxelController.class);

    @PostMapping("/upload")
    public String uploadFile(@RequestParam MultipartFile file) {
        try {
            // GLBファイルを一時ディレクトリに保存
            File tempFile = File.createTempFile("uploaded-", ".glb");
            file.transferTo(tempFile);

            // GLBファイルを読み込み
            GltfModel model = new GltfModelReader().read(tempFile.toURI());

            // シーンデータを取得し、メッシュをボクセルに変換
            List<SceneModel> scenes = model.getSceneModels();
            for (SceneModel scene : scenes) {
                List<NodeModel> nodes = scene.getNodeModels();
                for (NodeModel node : nodes) {
                    List<MeshModel> meshes = node.getMeshModels();
                    for (MeshModel mesh : meshes) {
                        // メッシュの処理
                        logger.info("Processing mesh: {}", mesh.getName());
                    }
                }
            }

            return "File uploaded and processed successfully!";
        } catch (IOException e) {
            logger.error("IOException occurred while uploading file: " + e.getMessage());
            return "File upload failed due to IO error!";
        } catch (IllegalStateException e) {
            logger.error("IllegalStateException occurred while uploading file: " + e.getMessage());
            return "File upload failed due to an illegal state!";
        }
    }
}
