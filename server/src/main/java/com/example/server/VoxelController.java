package com.example.server;

import java.io.File;
import java.io.IOException;
import java.nio.FloatBuffer;
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

import de.javagl.jgltf.model.AccessorData;
import de.javagl.jgltf.model.GltfModel;
import de.javagl.jgltf.model.NodeModel;
import de.javagl.jgltf.model.io.GltfModelReader;
import de.javagl.jgltf.model.v2.GltfModelV2;

@RestController
public class VoxelController {

    private static final Logger logger = LoggerFactory.getLogger(VoxelController.class);

    @GetMapping("/")
    public String hello() {
        return "Hello world!";
    }

    @PostMapping("/upload")
    public List<Map<String, Float>> uploadFile(@RequestParam MultipartFile file, @RequestParam float voxelSize) {
        List<Map<String, Float>> voxelCenters = new ArrayList<>();

        try {
            // GLBファイルを一時ディレクトリに保存
            File tempFile = File.createTempFile("uploaded-", ".glb");
            file.transferTo(tempFile);

            // GLBファイルを読み込み
            GltfModel model = new GltfModelReader().read(tempFile.toURI());

            // ボクセル化処理
            voxelCenters = voxelizeModel(model, voxelSize);

        } catch (IOException e) {
            logger.error("IOException occurred while uploading file: " + e.getMessage());
        } catch (IllegalStateException e) {
            logger.error("IllegalStateException occurred while uploading file: " + e.getMessage());
        }

        return voxelCenters;
    }

    private List<Map<String, Float>> voxelizeModel(GltfModel model, float voxelSize) {
        List<Map<String, Float>> voxelCenters = new ArrayList<>();
        List<float[]> vertices = getModelVertices(model);

        // 頂点情報をボクセルにスナップ
        for (float[] vertex : vertices) {
            Map<String, Float> voxel = new HashMap<>();
            voxel.put("x", Math.round(vertex[0] / voxelSize) * voxelSize);
            voxel.put("y", Math.round(vertex[1] / voxelSize) * voxelSize);
            voxel.put("z", Math.round(vertex[2] / voxelSize) * voxelSize);
            voxelCenters.add(voxel);
        }

        return voxelCenters;
    }

    private List<float[]> getModelVertices(GltfModel model) {
        List<float[]> vertices = new ArrayList<>();

        if (model instanceof GltfModelV2 modelV2) {
            modelV2.getNodeModels().forEach(node -> extractVerticesFromNode(node, vertices));
        }

        return vertices;
    }

    private void extractVerticesFromNode(NodeModel node, List<float[]> vertices) {
        node.getMeshModels().forEach(mesh ->
            mesh.getMeshPrimitiveModels().forEach(primitive -> {
                primitive.getAttributes().forEach((attributeName, accessorModel) -> {
                    if ("POSITION".equals(attributeName)) {
                        AccessorData accessorData = accessorModel.getAccessorData();
                        FloatBuffer floatBuffer = accessorData.createByteBuffer().asFloatBuffer();
                        while (floatBuffer.hasRemaining()) {
                            float[] vertex = new float[3];
                            floatBuffer.get(vertex);
                            vertices.add(vertex);
                        }
                    }
                });
            })
        );

        // 子ノードも再帰的に処理
        node.getChildren().forEach(child -> extractVerticesFromNode(child, vertices));
    }
}
