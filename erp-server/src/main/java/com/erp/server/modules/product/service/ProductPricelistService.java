package com.erp.server.modules.product.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.product.entity.ProductPricelist;
import com.erp.server.modules.product.dto.ProductPricelistDto;
import com.erp.server.modules.product.dto.query.ProductPricelistQueryDto;
import com.erp.server.modules.product.mapper.ProductPricelistMapper;
import org.springframework.stereotype.Service;
@Service
public class ProductPricelistService extends BaseCrudDtoService<ProductPricelistMapper, ProductPricelist, ProductPricelistDto, ProductPricelistQueryDto> {
    @Override public Class<ProductPricelist> getEntityClass() { return ProductPricelist.class; }
    @Override protected Class<ProductPricelistDto> getDtoClass() { return ProductPricelistDto.class; }

    @Override
    protected void beforeSaveDto(ProductPricelistDto dto) {
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
        if (dto.getCompanyId() == null) {
            dto.setCompanyId(1L);
        }
        if (dto.getCurrencyId() == null) {
            dto.setCurrencyId(1L);
        }
    }
}
