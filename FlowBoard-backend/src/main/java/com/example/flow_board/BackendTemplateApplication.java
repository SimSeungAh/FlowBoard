package com.example.flow_board;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendTemplateApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendTemplateApplication.class, args);
		System.out.println("http://localhost:8080/swagger-ui/index.html");
	}
}