package com.erp.server.modules.system.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "oldPassword不能为空")
    private String oldPassword;

    @NotBlank(message = "newPassword不能为空")
    @Size(min = 6, max = 64, message = "newPassword长度必须在6到64位之间")
    private String newPassword;

    @NotBlank(message = "confirmPassword不能为空")
    private String confirmPassword;
}
