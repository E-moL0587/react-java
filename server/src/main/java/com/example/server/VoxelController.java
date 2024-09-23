package com.example.server;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VoxelController {
    @GetMapping("/")
    public String hello() {
        return "Hello world!";
    }
}
