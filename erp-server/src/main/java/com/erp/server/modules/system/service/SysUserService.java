package com.erp.server.modules.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.system.dto.SysUserDto;
import com.erp.server.modules.system.dto.query.SysUserQueryDto;
import com.erp.server.modules.system.entity.SysUser;
import com.erp.server.modules.system.mapper.SysUserMapper;
import java.io.Serializable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SysUserService extends BaseCrudDtoService<SysUserMapper, SysUser, SysUserDto, SysUserQueryDto> {
    private final BCryptPasswordEncoder passwordEncoder;

    public SysUserService(BCryptPasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override public Class<SysUser> getEntityClass() { return SysUser.class; }
    @Override protected Class<SysUserDto> getDtoClass() { return SysUserDto.class; }

    @Override
    protected void beforeSaveDto(SysUserDto dto) {
        applyDefaults(dto, null);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, SysUserDto dto) {
        applyDefaults(dto, id == null ? null : Long.valueOf(String.valueOf(id)));
    }

    @Override
    public SysUserDto toDto(SysUser entity) {
        SysUserDto dto = super.toDto(entity);
        if (dto != null) {
            dto.setPassword(null);
        }
        return dto;
    }

    private void applyDefaults(SysUserDto dto, Long id) {
        if (dto.getUsername() != null) {
            dto.setUsername(dto.getUsername().trim());
        }
        if (dto.getRealName() != null) {
            dto.setRealName(dto.getRealName().trim());
        }
        validateUsername(dto.getUsername(), id);
        normalizePassword(dto, id == null);
        if (dto.getStatus() == null) {
            dto.setStatus(1);
        }
        if (dto.getDeleted() == null) {
            dto.setDeleted(0);
        }
        if ((dto.getName() == null || dto.getName().isBlank()) && dto.getUsername() != null && !dto.getUsername().isBlank()) {
            dto.setName(dto.getUsername());
        }
    }

    private void validateUsername(String username, Long id) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("用户名不能为空");
        }
        LambdaQueryWrapper<SysUser> query = new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("LIMIT 1");
        SysUser existing = getOne(query);
        if (existing != null && (id == null || !existing.getId().equals(id))) {
            throw new IllegalArgumentException("用户名已存在");
        }
    }

    private void normalizePassword(SysUserDto dto, boolean creating) {
        if (dto.getPassword() == null) {
            if (creating) {
                throw new IllegalArgumentException("新建用户必须设置密码");
            }
            return;
        }
        if (dto.getPassword().isBlank()) {
            if (creating) {
                throw new IllegalArgumentException("新建用户必须设置密码");
            }
            dto.setPassword(null);
            return;
        }
        if (!isEncodedPassword(dto.getPassword())) {
            dto.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
    }

    private boolean isEncodedPassword(String password) {
        return password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$");
    }

    @Override
    public boolean executeAction(Long id, String action) {
        SysUser user = getById(id);
        if (user == null) {
            return false;
        }
        if ("action_enable".equals(action)) {
            user.setStatus(1);
            user.setDeleted(0);
            return updateById(user);
        }
        if ("action_disable".equals(action)) {
            user.setStatus(0);
            return updateById(user);
        }
        if ("action_archive".equals(action)) {
            user.setDeleted(1);
            return updateById(user);
        }
        if ("action_restore".equals(action)) {
            user.setDeleted(0);
            return updateById(user);
        }
        return super.executeAction(id, action);
    }
}
