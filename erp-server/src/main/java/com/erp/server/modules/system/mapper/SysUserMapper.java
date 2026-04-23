package com.erp.server.modules.system.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.system.entity.SysUser;
import com.erp.server.modules.system.dto.query.SysUserQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface SysUserMapper extends BaseMapper<SysUser>, QueryPageMapper<SysUser, SysUserQueryDto> {}