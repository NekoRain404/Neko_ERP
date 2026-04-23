package com.erp.server.modules.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.system.dto.query.SysScriptQueryDto;
import com.erp.server.modules.system.entity.SysScript;

public interface SysScriptMapper extends BaseMapper<SysScript>, QueryPageMapper<SysScript, SysScriptQueryDto> {}
