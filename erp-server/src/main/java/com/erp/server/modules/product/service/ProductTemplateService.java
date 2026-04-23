package com.erp.server.modules.product.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.product.entity.ProductTemplate;
import com.erp.server.modules.product.dto.ProductTemplateDto;
import com.erp.server.modules.product.dto.query.ProductTemplateQueryDto;
import com.erp.server.modules.product.mapper.ProductTemplateMapper;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.math.BigDecimal;

@Service
public class ProductTemplateService extends BaseCrudDtoService<ProductTemplateMapper, ProductTemplate, ProductTemplateDto, ProductTemplateQueryDto> {
    @Override public Class<ProductTemplate> getEntityClass() { return ProductTemplate.class; }
    @Override protected Class<ProductTemplateDto> getDtoClass() { return ProductTemplateDto.class; }

    @Override
    protected void beforeSaveDto(ProductTemplateDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, ProductTemplateDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(ProductTemplateDto dto) {
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
        if (dto.getType() == null || dto.getType().isBlank()) {
            dto.setType("consu");
        }
        if (dto.getListPrice() == null) {
            dto.setListPrice(BigDecimal.ZERO);
        }
        if (dto.getStandardPrice() == null) {
            dto.setStandardPrice(BigDecimal.ZERO);
        }
    }
}
