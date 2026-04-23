package com.erp.server.modules.product.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.product.entity.ProductTemplate;
import com.erp.server.modules.product.dto.query.ProductTemplateQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ProductTemplateMapper extends BaseMapper<ProductTemplate>, QueryPageMapper<ProductTemplate, ProductTemplateQueryDto> {}