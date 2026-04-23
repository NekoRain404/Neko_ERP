package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.HrJob;
import com.erp.server.modules.base.dto.HrJobDto;
import com.erp.server.modules.base.dto.query.HrJobQueryDto;
import com.erp.server.modules.base.mapper.HrJobMapper;
import org.springframework.stereotype.Service;
@Service
public class HrJobService extends BaseCrudDtoService<HrJobMapper, HrJob, HrJobDto, HrJobQueryDto> {
    @Override public Class<HrJob> getEntityClass() { return HrJob.class; }
    @Override protected Class<HrJobDto> getDtoClass() { return HrJobDto.class; }
}