package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.ResCurrency;
import com.erp.server.modules.base.dto.ResCurrencyDto;
import com.erp.server.modules.base.dto.query.ResCurrencyQueryDto;
import com.erp.server.modules.base.mapper.ResCurrencyMapper;
import org.springframework.stereotype.Service;
@Service
public class ResCurrencyService extends BaseCrudDtoService<ResCurrencyMapper, ResCurrency, ResCurrencyDto, ResCurrencyQueryDto> {
    @Override public Class<ResCurrency> getEntityClass() { return ResCurrency.class; }
    @Override protected Class<ResCurrencyDto> getDtoClass() { return ResCurrencyDto.class; }

    @Override
    protected void beforeSaveDto(ResCurrencyDto dto) {
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
    }
}
