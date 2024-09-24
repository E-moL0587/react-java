package com.example.server;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VoxelController {

    @GetMapping("/")
    public String hello() {
        return "接続済み";
    }

    @PostMapping("/upload")
    public List<VoxelCoordinates> uploadVoxel(@RequestBody List<VoxelCoordinates> coordinates) {

        return coordinates.stream()
            .map(coord -> new VoxelCoordinates(coord.getX() / 3.0, coord.getY() / 3.0, coord.getZ() / 3.0))
            .collect(Collectors.toList());
    }
}

class VoxelCoordinates {
    private double x, y, z;

    public VoxelCoordinates() {}

    public VoxelCoordinates(double x, double y, double z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public double getZ() { return z; }
    public void setZ(double z) { this.z = z; }
}
