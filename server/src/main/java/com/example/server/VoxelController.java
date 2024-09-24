package com.example.server;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VoxelController {

    // 50件の座標を返すエンドポイント
    @PostMapping("/upload")
    public List<VoxelCoordinates> uploadVoxel(@RequestBody List<VoxelCoordinates> coordinates) {
        // 50件のデータを返す
        return coordinates.stream().limit(50).collect(Collectors.toList());
    }
}

// DTOクラス
class VoxelCoordinates {
    private int x;
    private int y;
    private int z;

    public VoxelCoordinates() {}

    public VoxelCoordinates(int x, int y, int z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Getters and Setters
    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }

    public int getZ() {
        return z;
    }

    public void setZ(int z) {
        this.z = z;
    }
}
