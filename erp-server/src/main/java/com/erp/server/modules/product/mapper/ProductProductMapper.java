package com.erp.server.modules.product.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.product.entity.ProductProduct;
import com.erp.server.modules.product.dto.query.ProductProductQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ProductProductMapper extends BaseMapper<ProductProduct>, QueryPageMapper<ProductProduct, ProductProductQueryDto> {}