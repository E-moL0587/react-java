package com.example.server;

import java.io.File;
import java.io.IOException;
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

import de.javagl.jgltf.model.GltfModel;
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
        List<Map<String, Float>> voxelCenters = new ArrayList<>();

        try {
            // GLBファイルを一時ディレクトリに保存
            File tempFile = File.createTempFile("uploaded-", ".glb");
            file.transferTo(tempFile);

            // GLBファイルを読み込み
            GltfModel model = new GltfModelReader().read(tempFile.toURI());

            // ボクセル化処理（例: 1単位グリッドに分割してボクセルの中心を計算）
            voxelCenters = voxelizeModel(model, 1.0f); // 1.0fはボクセルサイズを表します。

        } catch (IOException e) {
            logger.error("IOException occurred while uploading file: " + e.getMessage());
        } catch (IllegalStateException e) {
            logger.error("IllegalStateException occurred while uploading file: " + e.getMessage());
        }

        return voxelCenters;
    }

    /**
     * 3Dモデルをボクセル化し、各ボクセルの中心の座標を取得します。
     * @param model 読み込んだ3Dモデル
     * @param voxelSize ボクセルサイズ
     * @return ボクセルの中心座標リスト
     */
    private List<Map<String, Float>> voxelizeModel(GltfModel model, float voxelSize) {
        List<Map<String, Float>> voxelCenters = new ArrayList<>();

        // モデルの頂点情報を取得
        List<float[]> vertices = getModelVertices(model);

        // ボクセル化
        Map<String, Boolean> voxelMap = new HashMap<>();
        for (float[] vertex : vertices) {
            int vx = (int) (Math.floor(vertex[0] / voxelSize));
            int vy = (int) (Math.floor(vertex[1] / voxelSize));
            int vz = (int) (Math.floor(vertex[2] / voxelSize));

            String voxelKey = vx + "_" + vy + "_" + vz;
            if (!voxelMap.containsKey(voxelKey)) {
                // ボクセルの中心座標を計算
                float centerX = (vx + 0.5f) * voxelSize;
                float centerY = (vy + 0.5f) * voxelSize;
                float centerZ = (vz + 0.5f) * voxelSize;

                // ボクセルの中心座標を保存
                Map<String, Float> voxelCenter = new HashMap<>();
                voxelCenter.put("x", centerX);
                voxelCenter.put("y", centerY);
                voxelCenter.put("z", centerZ);
                voxelCenters.add(voxelCenter);

                // ボクセルが既に登録されているかマーク
                voxelMap.put(voxelKey, true);
            }
        }

        return voxelCenters;
    }

    /**
     * 3Dモデルの頂点データを取得します（ここでは仮のロジックとして実装）。
     * @param model 読み込んだ3Dモデル
     * @return 頂点座標リスト
     */
    private List<float[]> getModelVertices(GltfModel model) {
        // 実際にはモデルから頂点データを抽出する処理が必要です。
        // モデルのメッシュやバッファを走査し、頂点データを取得するロジックを実装します。

        List<float[]> vertices = new ArrayList<>();

        // 仮に (0,0,0) の頂点を持つモデルを処理する場合:
        vertices.add(new float[]{0.0f, 0.0f, 0.0f});
        vertices.add(new float[]{1.0f, 1.0f, 1.0f});
        vertices.add(new float[]{2.0f, 2.0f, 2.0f});

        return vertices;
    }
}
