package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.HrEmployee;
import com.erp.server.modules.base.dto.HrEmployeeDto;
import com.erp.server.modules.base.dto.query.HrEmployeeQueryDto;
import com.erp.server.modules.base.mapper.HrEmployeeMapper;
import org.springframework.stereotype.Service;
@Service
public class HrEmployeeService extends BaseCrudDtoService<HrEmployeeMapper, HrEmployee, HrEmployeeDto, HrEmployeeQueryDto> {
    @Override public Class<HrEmployee> getEntityClass() { return HrEmployee.class; }
    @Override protected Class<HrEmployeeDto> getDtoClass() { return HrEmployeeDto.class; }
}