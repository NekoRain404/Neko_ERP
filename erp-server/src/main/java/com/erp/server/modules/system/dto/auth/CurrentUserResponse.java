package com.erp.server.modules.system.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CurrentUserResponse {
    private Long userId;
    private String username;
    private String realName;
    private Long partnerId;
    private Integer status;
}
