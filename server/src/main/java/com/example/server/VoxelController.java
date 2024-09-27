package com.example.server;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VoxelController {

    @Autowired
    private MarchingCubes marchingCubes;

    @PostMapping("/upload")
    public List<VoxelCoordinates> uploadVoxel(@RequestBody List<VoxelCoordinates> coordinates) {
        List<VoxelCoordinates> meshData = marchingCubes.generateMesh(coordinates);
        return meshData;
    }
}
