package com.example.backend_template;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
public class BackendTemplateApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendTemplateApplication.class, args);
		System.out.println("http://localhost:8080/swagger-ui/index.html");
	}
}