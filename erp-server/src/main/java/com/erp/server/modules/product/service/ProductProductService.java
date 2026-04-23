package com.erp.server.modules.product.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.product.entity.ProductProduct;
import com.erp.server.modules.product.dto.ProductProductDto;
import com.erp.server.modules.product.dto.query.ProductProductQueryDto;
import com.erp.server.modules.product.mapper.ProductProductMapper;
import org.springframework.stereotype.Service;
import java.io.Serializable;
@Service
public class ProductProductService extends BaseCrudDtoService<ProductProductMapper, ProductProduct, ProductProductDto, ProductProductQueryDto> {
    @Override public Class<ProductProduct> getEntityClass() { return ProductProduct.class; }
    @Override protected Class<ProductProductDto> getDtoClass() { return ProductProductDto.class; }

    @Override
    protected void beforeSaveDto(ProductProductDto dto) {
        if (dto.getActive() == null) {
            dto.setActive(Boolean.TRUE);
        }
    }

    @Override
    protected void beforeUpdateDto(Serializable id, ProductProductDto dto) {
        if (dto.getActive() == null) {
            ProductProduct current = getById(id);
            if (current != null && current.getActive() != null) {
                dto.setActive(current.getActive());
            }
        }
    }
}
