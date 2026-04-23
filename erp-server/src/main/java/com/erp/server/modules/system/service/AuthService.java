package com.erp.server.modules.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.modules.system.dto.auth.ChangePasswordRequest;
import com.erp.server.modules.system.dto.auth.CurrentUserResponse;
import com.erp.server.modules.system.dto.auth.LoginRequest;
import com.erp.server.modules.system.dto.auth.LoginResponse;
import com.erp.server.modules.system.entity.SysUser;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final SysUserService sysUserService;
    private final AuthTokenService authTokenService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(
            SysUserService sysUserService,
            AuthTokenService authTokenService,
            BCryptPasswordEncoder passwordEncoder
    ) {
        this.sysUserService = sysUserService;
        this.authTokenService = authTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        String username = request.getUsername() == null ? null : request.getUsername().trim();
        SysUser user = findUserByUsername(username);
        if (user == null || !isUserAvailable(user)) {
            throw new IllegalArgumentException("用户名或密码错误");
        }
        if (!passwordMatches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }
        upgradeLegacyPasswordIfNeeded(user, request.getPassword());

        return LoginResponse.builder()
                .token(authTokenService.createToken(user))
                .userId(user.getId())
                .username(user.getUsername())
                .realName(user.getRealName())
                .build();
    }

    public CurrentUserResponse getCurrentUser(String authorizationHeader) {
        SysUser user = requireCurrentUser(authorizationHeader);
        return CurrentUserResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .realName(user.getRealName())
                .partnerId(user.getPartnerId())
                .status(user.getStatus())
                .build();
    }

    public void changePassword(String authorizationHeader, ChangePasswordRequest request) {
        SysUser user = requireCurrentUser(authorizationHeader);
        if (!passwordMatches(request.getOldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("原密码不正确");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("两次输入的新密码不一致");
        }
        if (request.getOldPassword().equals(request.getNewPassword())) {
            throw new IllegalArgumentException("新密码不能与原密码相同");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        sysUserService.updateById(user);
    }

    private SysUser requireCurrentUser(String authorizationHeader) {
        Long userId = authTokenService.parseUserIdFromAuthorizationHeader(authorizationHeader);
        SysUser user = sysUserService.getById(userId);
        if (user == null || !isUserAvailable(user)) {
            throw new IllegalArgumentException("当前会话已失效，请重新登录");
        }
        return user;
    }

    private SysUser findUserByUsername(String username) {
        return sysUserService.getOne(
                new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUsername, username)
                        .last("LIMIT 1")
        );
    }

    private boolean isUserAvailable(SysUser user) {
        return Integer.valueOf(1).equals(user.getStatus()) && !Integer.valueOf(1).equals(user.getDeleted());
    }

    private void upgradeLegacyPasswordIfNeeded(SysUser user, String rawPassword) {
        if (user.getPassword() == null || isEncodedPassword(user.getPassword())) {
            return;
        }
        user.setPassword(passwordEncoder.encode(rawPassword));
        sysUserService.updateById(user);
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (storedPassword == null || storedPassword.isBlank()) {
            return false;
        }
        if (isEncodedPassword(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return storedPassword.equals(rawPassword);
    }

    private boolean isEncodedPassword(String password) {
        return password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$");
    }
}
