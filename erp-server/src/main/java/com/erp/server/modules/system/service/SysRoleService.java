package com.erp.server.modules.system.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.system.dto.SysRoleDto;
import com.erp.server.modules.system.dto.query.SysRoleQueryDto;
import com.erp.server.modules.system.entity.SysRole;
import com.erp.server.modules.system.mapper.SysRoleMapper;
import java.io.Serializable;
import org.springframework.stereotype.Service;

@Service
public class SysRoleService extends BaseCrudDtoService<SysRoleMapper, SysRole, SysRoleDto, SysRoleQueryDto> {
    @Override public Class<SysRole> getEntityClass() { return SysRole.class; }
    @Override protected Class<SysRoleDto> getDtoClass() { return SysRoleDto.class; }

    @Override
    protected void beforeSaveDto(SysRoleDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, SysRoleDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(SysRoleDto dto) {
        if (dto.getStatus() == null) {
            dto.setStatus(1);
        }
        if (dto.getDeleted() == null) {
            dto.setDeleted(0);
        }
        if ((dto.getName() == null || dto.getName().isBlank()) && dto.getRoleCode() != null && !dto.getRoleCode().isBlank()) {
            dto.setName(dto.getRoleCode());
        }
    }

    @Override
    public boolean executeAction(Long id, String action) {
        SysRole role = getById(id);
        if (role == null) {
            return false;
        }
        if ("action_enable".equals(action)) {
            role.setStatus(1);
            role.setDeleted(0);
            return updateById(role);
        }
        if ("action_disable".equals(action)) {
            role.setStatus(0);
            return updateById(role);
        }
        if ("action_archive".equals(action)) {
            role.setDeleted(1);
            return updateById(role);
        }
        if ("action_restore".equals(action)) {
            role.setDeleted(0);
            return updateById(role);
        }
        return super.executeAction(id, action);
    }
}
