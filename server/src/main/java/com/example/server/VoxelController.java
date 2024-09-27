package com.example.server;

import java.util.List;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VoxelController {

    @PostMapping("/upload")
    public List<VoxelCoordinates> uploadVoxel(@RequestBody List<VoxelCoordinates> coordinates) {
        return coordinates;
    }
}
