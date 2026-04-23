package com.erp.server.modules.system.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.system.dto.SysScriptDto;
import com.erp.server.modules.system.dto.query.SysScriptQueryDto;
import com.erp.server.modules.system.entity.SysScript;
import com.erp.server.modules.system.mapper.SysScriptMapper;
import org.springframework.stereotype.Service;

@Service
public class SysScriptService extends BaseCrudDtoService<SysScriptMapper, SysScript, SysScriptDto, SysScriptQueryDto> {
    @Override public Class<SysScript> getEntityClass() { return SysScript.class; }
    @Override protected Class<SysScriptDto> getDtoClass() { return SysScriptDto.class; }
}
