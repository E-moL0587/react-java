package com.example.server;

import java.io.File;
import java.io.IOException;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.joml.Matrix4f;
import org.joml.Quaternionf;
import org.joml.Vector3f;
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

    // 各ノードから頂点を抽出し、変換行列を適用する
    private void extractVerticesFromNode(NodeModel node, List<float[]> vertices) {
        // ノードの変換行列を取得
        Matrix4f transform = new Matrix4f();

        // スケール、回転、位置を取得して行列に適用
        Vector3f translation = new Vector3f(0.0f, 0.0f, 0.0f);
        if (node.getTranslation() != null) {
            float[] translationArray = node.getTranslation();
            translation.set(translationArray[0], translationArray[1], translationArray[2]);
        }

        Vector3f scale = new Vector3f(1.0f, 1.0f, 1.0f);
        if (node.getScale() != null) {
            float[] scaleArray = node.getScale();
            scale.set(scaleArray[0], scaleArray[1], scaleArray[2]);
        }

        float[] rotationArray = new float[4];
        if (node.getRotation() != null) {
            rotationArray = node.getRotation();
        }

        // 行列に適用
        transform.translate(translation);
        transform.scale(scale);
        transform.rotate(new Quaternionf(rotationArray[0], rotationArray[1], rotationArray[2], rotationArray[3]));

        // メッシュごとに処理
        node.getMeshModels().forEach(mesh ->
            mesh.getMeshPrimitiveModels().forEach(primitive -> {
                primitive.getAttributes().forEach((attributeName, accessorModel) -> {
                    if ("POSITION".equals(attributeName)) {
                        AccessorData accessorData = accessorModel.getAccessorData();
                        FloatBuffer floatBuffer = accessorData.createByteBuffer().asFloatBuffer();
                        while (floatBuffer.hasRemaining()) {
                            float[] vertex = new float[3];
                            floatBuffer.get(vertex);

                            // 頂点に変換行列を適用
                            Vector3f transformedVertex = new Vector3f(vertex[0], vertex[1], vertex[2]);
                            transform.transformPosition(transformedVertex);

                            // 頂点をリストに追加
                            vertices.add(new float[]{transformedVertex.x, transformedVertex.y, transformedVertex.z});
                        }
                    }
                });
            })
        );

        // 子ノードも再帰的に処理
        node.getChildren().forEach(child -> extractVerticesFromNode(child, vertices));
    }
}
