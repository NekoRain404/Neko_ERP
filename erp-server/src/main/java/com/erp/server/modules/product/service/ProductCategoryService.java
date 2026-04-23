package com.erp.server.modules.product.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.product.entity.ProductCategory;
import com.erp.server.modules.product.dto.ProductCategoryDto;
import com.erp.server.modules.product.dto.query.ProductCategoryQueryDto;
import com.erp.server.modules.product.mapper.ProductCategoryMapper;
import org.springframework.stereotype.Service;
@Service
public class ProductCategoryService extends BaseCrudDtoService<ProductCategoryMapper, ProductCategory, ProductCategoryDto, ProductCategoryQueryDto> {
    @Override public Class<ProductCategory> getEntityClass() { return ProductCategory.class; }
    @Override protected Class<ProductCategoryDto> getDtoClass() { return ProductCategoryDto.class; }
}
