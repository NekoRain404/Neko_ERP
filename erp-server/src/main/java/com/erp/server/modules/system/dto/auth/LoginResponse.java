package com.erp.server.modules.system.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String token;
    private Long userId;
    private String username;
    private String realName;
}
