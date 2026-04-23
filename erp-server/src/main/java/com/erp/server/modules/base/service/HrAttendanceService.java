package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.HrAttendance;
import com.erp.server.modules.base.dto.HrAttendanceDto;
import com.erp.server.modules.base.dto.query.HrAttendanceQueryDto;
import com.erp.server.modules.base.mapper.HrAttendanceMapper;
import org.springframework.stereotype.Service;
@Service
public class HrAttendanceService extends BaseCrudDtoService<HrAttendanceMapper, HrAttendance, HrAttendanceDto, HrAttendanceQueryDto> {
    @Override public Class<HrAttendance> getEntityClass() { return HrAttendance.class; }
    @Override protected Class<HrAttendanceDto> getDtoClass() { return HrAttendanceDto.class; }
}