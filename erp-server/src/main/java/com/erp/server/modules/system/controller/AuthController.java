package com.erp.server.modules.system.controller;

import com.erp.server.common.Result;
import com.erp.server.modules.system.dto.auth.ChangePasswordRequest;
import com.erp.server.modules.system.dto.auth.CurrentUserResponse;
import com.erp.server.modules.system.dto.auth.LoginRequest;
import com.erp.server.modules.system.dto.auth.LoginResponse;
import com.erp.server.modules.system.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request));
    }

    @GetMapping("/me")
    public Result<CurrentUserResponse> me(
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader
    ) {
        return Result.success(authService.getCurrentUser(authorizationHeader));
    }

    @PostMapping("/change-password")
    public Result<Boolean> changePassword(
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(authorizationHeader, request);
        return Result.success(true);
    }
}
