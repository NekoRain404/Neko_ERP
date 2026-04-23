package com.erp.server.modules.base.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.ResPartner;
import com.erp.server.modules.base.dto.ResPartnerDto;
import com.erp.server.modules.base.dto.query.ResPartnerQueryDto;
import com.erp.server.modules.base.mapper.ResPartnerMapper;
import org.springframework.stereotype.Service;

import java.io.Serializable;

@Service
public class ResPartnerService extends BaseCrudDtoService<ResPartnerMapper, ResPartner, ResPartnerDto, ResPartnerQueryDto> {
    @Override public Class<ResPartner> getEntityClass() { return ResPartner.class; }
    @Override protected Class<ResPartnerDto> getDtoClass() { return ResPartnerDto.class; }

    @Override
    protected void beforeSaveDto(ResPartnerDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, ResPartnerDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(ResPartnerDto dto) {
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
        if (dto.getIsCompany() == null) {
            dto.setIsCompany(Boolean.FALSE);
        }
        if (dto.getType() == null || dto.getType().isBlank()) {
            dto.setType("contact");
        }
    }
}
