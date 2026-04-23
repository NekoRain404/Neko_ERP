package com.erp.server.modules.base.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.dto.CrmLeadDto;
import com.erp.server.modules.base.dto.query.CrmLeadQueryDto;
import com.erp.server.modules.base.entity.CrmLead;
import com.erp.server.modules.base.mapper.CrmLeadMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class CrmLeadService extends BaseCrudDtoService<CrmLeadMapper, CrmLead, CrmLeadDto, CrmLeadQueryDto> {
    @Override public Class<CrmLead> getEntityClass() { return CrmLead.class; }
    @Override protected Class<CrmLeadDto> getDtoClass() { return CrmLeadDto.class; }

    @Override
    protected void beforeSaveDto(CrmLeadDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, CrmLeadDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(CrmLeadDto dto) {
        if (dto.getType() == null || dto.getType().isBlank()) {
            dto.setType("lead");
        }
        if (dto.getPriority() == null || dto.getPriority().isBlank()) {
            dto.setPriority("0");
        }
        if (dto.getProbability() == null) {
            dto.setProbability(BigDecimal.ZERO);
        }
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
    }

    @Override
    public boolean executeAction(Long id, String action) {
        CrmLead lead = getById(id);
        if (lead == null) {
            return false;
        }
        if ("action_mark_won".equals(action)) {
            lead.setProbability(BigDecimal.valueOf(100));
            lead.setPriority("3");
            lead.setActive(Boolean.TRUE);
            return updateById(lead);
        }
        if ("action_set_lost".equals(action)) {
            lead.setProbability(BigDecimal.ZERO);
            lead.setActive(Boolean.FALSE);
            return updateById(lead);
        }
        if ("action_restore".equals(action)) {
            lead.setActive(Boolean.TRUE);
            return updateById(lead);
        }
        return super.executeAction(id, action);
    }
}
