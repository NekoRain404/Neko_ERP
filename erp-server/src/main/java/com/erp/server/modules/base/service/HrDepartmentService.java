package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.HrDepartment;
import com.erp.server.modules.base.dto.HrDepartmentDto;
import com.erp.server.modules.base.dto.query.HrDepartmentQueryDto;
import com.erp.server.modules.base.mapper.HrDepartmentMapper;
import org.springframework.stereotype.Service;
@Service
public class HrDepartmentService extends BaseCrudDtoService<HrDepartmentMapper, HrDepartment, HrDepartmentDto, HrDepartmentQueryDto> {
    @Override public Class<HrDepartment> getEntityClass() { return HrDepartment.class; }
    @Override protected Class<HrDepartmentDto> getDtoClass() { return HrDepartmentDto.class; }
}