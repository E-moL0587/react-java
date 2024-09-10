package com.example.server;

import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import de.javagl.jgltf.model.AccessorModel;
import de.javagl.jgltf.model.GltfModel;
import de.javagl.jgltf.model.MeshModel;
import de.javagl.jgltf.model.MeshPrimitiveModel;
import de.javagl.jgltf.model.NodeModel;
import de.javagl.jgltf.model.SceneModel;
import de.javagl.jgltf.model.io.GltfModelReader;

@RestController
public class VoxelController {

    private static final Logger logger = LoggerFactory.getLogger(VoxelController.class);

    @GetMapping("/")
    public String hello() {
        return "Hello world!";
    }

    @PostMapping("/upload")
    public List<Map<String, Float>> uploadFile(@RequestParam MultipartFile file) {
        List<Map<String, Float>> vertexList = new ArrayList<>();

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
                        List<MeshPrimitiveModel> primitives = mesh.getMeshPrimitiveModels();
                        for (MeshPrimitiveModel primitive : primitives) {
                            // 頂点情報を取得
                            AccessorModel positionAccessor = primitive.getAttributes().get("POSITION");
                            if (positionAccessor != null) {
                                ByteBuffer bufferData = positionAccessor.getBufferViewModel().getBufferModel().getBufferData();
                                bufferData.order(ByteOrder.LITTLE_ENDIAN); // エンディアンを設定

                                int count = positionAccessor.getCount(); // 頂点数を取得
                                int stride = positionAccessor.getByteStride() > 0 ? positionAccessor.getByteStride() : 12; // ストライド
                                int offset = positionAccessor.getByteOffset(); // オフセット

                                for (int i = 0; i < count; i++) {
                                    int baseOffset = offset + i * stride;

                                    float x = bufferData.getFloat(baseOffset);
                                    float y = bufferData.getFloat(baseOffset + 4);
                                    float z = bufferData.getFloat(baseOffset + 8);

                                    Map<String, Float> vertex = new HashMap<>();
                                    vertex.put("x", x);
                                    vertex.put("y", y);
                                    vertex.put("z", z);
                                    vertexList.add(vertex);

                                    logger.info("Vertex: x={}, y={}, z={}", x, y, z);
                                }
                            }
                        }
                    }
                }
            }

        } catch (IOException e) {
            logger.error("IOException occurred while uploading file: " + e.getMessage());
        } catch (IllegalStateException e) {
            logger.error("IllegalStateException occurred while uploading file: " + e.getMessage());
        }

        return vertexList;
    }
}
