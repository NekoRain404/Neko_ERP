package com.erp.server.modules.sale.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.sale.entity.SaleOrder;
import com.erp.server.modules.sale.dto.query.SaleOrderQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface SaleOrderMapper extends BaseMapper<SaleOrder>, QueryPageMapper<SaleOrder, SaleOrderQueryDto> {}