package com.example.server;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class MarchingCubes {

    private final int[] edgeTable;
    private final int[][] triTable;

    public MarchingCubes(int[] edgeTable, int[][] triTable) {
        this.edgeTable = edgeTable;
        this.triTable = triTable;
    }

    public List<VoxelCoordinates> generateMesh(List<VoxelCoordinates> voxelData) {
        int width = 0, height = 0, depth = 0;

        List<VoxelCoordinates> meshData = new ArrayList<>();
        int[][][] scalarField = new int[width][height][depth];

        for (int x = 0; x < width - 1; x++) {
            for (int y = 0; y < height - 1; y++) {
                for (int z = 0; z < depth - 1; z++) {
                    float[] cube = new float[8];
                    for (int i = 0; i < 8; i++) {
                        int xi = x + VertexOffset[i][0];
                        int yi = y + VertexOffset[i][1];
                        int zi = z + VertexOffset[i][2];
                        cube[i] = scalarField[xi][yi][zi];
                    }
                    ProcessCube(meshData, cube, x, y, z);
                }
            }
        }

        return meshData;
    }

    private void ProcessCube(List<VoxelCoordinates> meshData, float[] cube, int x, int y, int z) {
        int cubeIndex = 0;
        if (cube[0] > 0.5f) cubeIndex |= 1;
        if (cube[1] > 0.5f) cubeIndex |= 2;
        if (cube[2] > 0.5f) cubeIndex |= 4;
        if (cube[3] > 0.5f) cubeIndex |= 8;
        if (cube[4] > 0.5f) cubeIndex |= 16;
        if (cube[5] > 0.5f) cubeIndex |= 32;
        if (cube[6] > 0.5f) cubeIndex |= 64;
        if (cube[7] > 0.5f) cubeIndex |= 128;

        int edges = edgeTable[cubeIndex];

        if (edges == 0) return;

        VoxelCoordinates[] vertexList = new VoxelCoordinates[12];
        if ((edges & 1) != 0) vertexList[0] = VertexInterp(cube[0], cube[1], x, y, z, 0, 1);
        if ((edges & 2) != 0) vertexList[1] = VertexInterp(cube[1], cube[2], x, y, z, 1, 2);
        if ((edges & 4) != 0) vertexList[2] = VertexInterp(cube[2], cube[3], x, y, z, 2, 3);
        if ((edges & 8) != 0) vertexList[3] = VertexInterp(cube[3], cube[0], x, y, z, 3, 0);
        if ((edges & 16) != 0) vertexList[4] = VertexInterp(cube[4], cube[5], x, y, z, 4, 5);
        if ((edges & 32) != 0) vertexList[5] = VertexInterp(cube[5], cube[6], x, y, z, 5, 6);
        if ((edges & 64) != 0) vertexList[6] = VertexInterp(cube[6], cube[7], x, y, z, 6, 7);
        if ((edges & 128) != 0) vertexList[7] = VertexInterp(cube[7], cube[4], x, y, z, 7, 4);
        if ((edges & 256) != 0) vertexList[8] = VertexInterp(cube[0], cube[4], x, y, z, 0, 4);
        if ((edges & 512) != 0) vertexList[9] = VertexInterp(cube[1], cube[5], x, y, z, 1, 5);
        if ((edges & 1024) != 0) vertexList[10] = VertexInterp(cube[2], cube[6], x, y, z, 2, 6);
        if ((edges & 2048) != 0) vertexList[11] = VertexInterp(cube[3], cube[7], x, y, z, 3, 7);

        for (int i = 0; triTable[cubeIndex][i] != -1; i += 3) {
            meshData.add(vertexList[triTable[cubeIndex][i]]);
            meshData.add(vertexList[triTable[cubeIndex][i + 1]]);
            meshData.add(vertexList[triTable[cubeIndex][i + 2]]);
        }
    }

    private VoxelCoordinates VertexInterp(float valP1, float valP2, int x, int y, int z, int p1, int p2) {
        if (Math.abs(0.5f - valP1) < 0.00001)
            return new VoxelCoordinates(x + VertexOffset[p1][0], y + VertexOffset[p1][1], z + VertexOffset[p1][2]);
        if (Math.abs(0.5f - valP2) < 0.00001)
            return new VoxelCoordinates(x + VertexOffset[p2][0], y + VertexOffset[p2][1], z + VertexOffset[p2][2]);
        if (Math.abs(valP1 - valP2) < 0.00001)
            return new VoxelCoordinates(x + VertexOffset[p1][0], y + VertexOffset[p1][1], z + VertexOffset[p1][2]);

        float mu = (0.5f - valP1) / (valP2 - valP1);
        return new VoxelCoordinates(
            x + VertexOffset[p1][0] + mu * (VertexOffset[p2][0] - VertexOffset[p1][0]),
            y + VertexOffset[p1][1] + mu * (VertexOffset[p2][1] - VertexOffset[p1][1]),
            z + VertexOffset[p1][2] + mu * (VertexOffset[p2][2] - VertexOffset[p1][2])
        );
    }

    private static final int[][] VertexOffset = new int[][] {
        {0, 0, 0}, {1, 0, 0}, {1, 1, 0}, {0, 1, 0},
        {0, 0, 1}, {1, 0, 1}, {1, 1, 1}, {0, 1, 1}
    };
}
