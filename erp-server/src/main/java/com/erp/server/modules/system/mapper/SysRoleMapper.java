package com.erp.server.modules.system.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.system.entity.SysRole;
import com.erp.server.modules.system.dto.query.SysRoleQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole>, QueryPageMapper<SysRole, SysRoleQueryDto> {}