package com.erp.server.modules.product.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.product.entity.ProductPricelist;
import com.erp.server.modules.product.dto.query.ProductPricelistQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ProductPricelistMapper extends BaseMapper<ProductPricelist>, QueryPageMapper<ProductPricelist, ProductPricelistQueryDto> {}