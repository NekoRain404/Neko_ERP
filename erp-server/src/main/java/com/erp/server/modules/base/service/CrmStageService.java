package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.CrmStage;
import com.erp.server.modules.base.dto.CrmStageDto;
import com.erp.server.modules.base.dto.query.CrmStageQueryDto;
import com.erp.server.modules.base.mapper.CrmStageMapper;
import org.springframework.stereotype.Service;
@Service
public class CrmStageService extends BaseCrudDtoService<CrmStageMapper, CrmStage, CrmStageDto, CrmStageQueryDto> {
    @Override public Class<CrmStage> getEntityClass() { return CrmStage.class; }
    @Override protected Class<CrmStageDto> getDtoClass() { return CrmStageDto.class; }
}