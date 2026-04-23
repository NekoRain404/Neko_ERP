package com.erp.server;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication
@MapperScan("com.erp.server.modules.*.mapper")
public class ErpServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ErpServerApplication.class, args);
    }
}
