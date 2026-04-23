package com.erp.server.modules.base.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.dto.HrLeaveDto;
import com.erp.server.modules.base.dto.query.HrLeaveQueryDto;
import com.erp.server.modules.base.entity.HrLeave;
import com.erp.server.modules.base.mapper.HrLeaveMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class HrLeaveService extends BaseCrudDtoService<HrLeaveMapper, HrLeave, HrLeaveDto, HrLeaveQueryDto> {
    @Override public Class<HrLeave> getEntityClass() { return HrLeave.class; }
    @Override protected Class<HrLeaveDto> getDtoClass() { return HrLeaveDto.class; }

    @Override
    protected void beforeSaveDto(HrLeaveDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, HrLeaveDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(HrLeaveDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getDateFrom() == null) {
            dto.setDateFrom(LocalDateTime.now());
        }
        if (dto.getDateTo() == null) {
            dto.setDateTo(dto.getDateFrom().plusDays(1));
        }
        if (dto.getNumberOfDays() == null) {
            dto.setNumberOfDays(BigDecimal.ONE);
        }
    }

    @Override
    public boolean executeAction(Long id, String action) {
        HrLeave leave = getById(id);
        if (leave == null) {
            return false;
        }
        if ("action_confirm".equals(action)) {
            leave.setState("confirm");
            return updateById(leave);
        }
        if ("action_approve".equals(action)) {
            leave.setState("validate");
            return updateById(leave);
        }
        if ("action_refuse".equals(action)) {
            leave.setState("refuse");
            return updateById(leave);
        }
        if ("action_draft".equals(action)) {
            leave.setState("draft");
            return updateById(leave);
        }
        return super.executeAction(id, action);
    }
}
