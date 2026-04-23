package com.erp.server.modules.mrp.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.mrp.entity.MrpBom;
import com.erp.server.modules.mrp.dto.MrpBomDto;
import com.erp.server.modules.mrp.dto.query.MrpBomQueryDto;
import com.erp.server.modules.mrp.mapper.MrpBomMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
@Service
public class MrpBomService extends BaseCrudDtoService<MrpBomMapper, MrpBom, MrpBomDto, MrpBomQueryDto> {
    @Override public Class<MrpBom> getEntityClass() { return MrpBom.class; }
    @Override protected Class<MrpBomDto> getDtoClass() { return MrpBomDto.class; }

    @Override
    protected void beforeSaveDto(MrpBomDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, MrpBomDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(MrpBomDto dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            dto.setName(dto.getCode() == null || dto.getCode().isBlank() ? "BOM-AUTO" : dto.getCode());
        }
        if (dto.getProductQty() == null) {
            dto.setProductQty(BigDecimal.ONE);
        }
    }
}
