package com.example.server;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class VoxelController {

    private static final Logger logger = LoggerFactory.getLogger(VoxelController.class);

    @GetMapping("/")
    public String hello() {
        return "Hello world!";
    }

    @PostMapping("/upload")
    public String uploadFile(@RequestParam MultipartFile file) {
        try {
            file.transferTo(new java.io.File("/path/to/save/" + file.getOriginalFilename()));
            return "File uploaded successfully!";
        } catch (IOException e) {
            logger.error("IOException occurred while uploading file: " + e.getMessage());
            return "File upload failed due to IO error!";
        } catch (IllegalStateException e) {
            logger.error("IllegalStateException occurred while uploading file: " + e.getMessage());
            return "File upload failed due to an illegal state!";
        }
    }
}
