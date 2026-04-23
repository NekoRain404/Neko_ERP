package com.erp.server.modules.sale.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.sale.entity.SaleOrderLine;
import com.erp.server.modules.sale.dto.query.SaleOrderLineQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface SaleOrderLineMapper extends BaseMapper<SaleOrderLine>, QueryPageMapper<SaleOrderLine, SaleOrderLineQueryDto> {}