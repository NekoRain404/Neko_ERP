package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.ResCompany;
import com.erp.server.modules.base.dto.ResCompanyDto;
import com.erp.server.modules.base.dto.query.ResCompanyQueryDto;
import com.erp.server.modules.base.mapper.ResCompanyMapper;
import org.springframework.stereotype.Service;
import java.io.Serializable;
@Service
public class ResCompanyService extends BaseCrudDtoService<ResCompanyMapper, ResCompany, ResCompanyDto, ResCompanyQueryDto> {
    @Override public Class<ResCompany> getEntityClass() { return ResCompany.class; }
    @Override protected Class<ResCompanyDto> getDtoClass() { return ResCompanyDto.class; }

    @Override
    protected void beforeSaveDto(ResCompanyDto dto) {
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
    }

    @Override
    protected void beforeUpdateDto(Serializable id, ResCompanyDto dto) {
        if (dto.getActive() == null) {
            ResCompany current = getById(id);
            if (current != null && current.getActive() != null) {
                dto.setActive(current.getActive());
            }
        }
    }
}
