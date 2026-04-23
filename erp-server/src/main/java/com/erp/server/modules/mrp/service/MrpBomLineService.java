package com.erp.server.modules.mrp.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.mrp.dto.MrpBomLineDto;
import com.erp.server.modules.mrp.dto.query.MrpBomLineQueryDto;
import com.erp.server.modules.mrp.entity.MrpBom;
import com.erp.server.modules.mrp.entity.MrpBomLine;
import com.erp.server.modules.mrp.mapper.MrpBomLineMapper;
import com.erp.server.modules.mrp.mapper.MrpBomMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MrpBomLineService extends BaseCrudDtoService<MrpBomLineMapper, MrpBomLine, MrpBomLineDto, MrpBomLineQueryDto> {
    private final MrpBomMapper bomMapper;

    @Override public Class<MrpBomLine> getEntityClass() { return MrpBomLine.class; }
    @Override protected Class<MrpBomLineDto> getDtoClass() { return MrpBomLineDto.class; }

    @Override
    protected void beforeSaveDto(MrpBomLineDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, MrpBomLineDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(MrpBomLineDto dto) {
        MrpBom bom = dto.getBomId() == null ? null : bomMapper.selectById(dto.getBomId());
        if (dto.getName() == null || dto.getName().isBlank()) {
            dto.setName("BOM-LINE-" + (dto.getProductId() == null ? "AUTO" : dto.getProductId()));
        }
        if (dto.getProductQty() == null) {
            dto.setProductQty(BigDecimal.ONE);
        }
        if (dto.getCompanyId() == null && bom != null) {
            dto.setCompanyId(bom.getCompanyId());
        }
    }
}
