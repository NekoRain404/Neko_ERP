package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockWarehouse;
import com.erp.server.modules.stock.dto.query.StockWarehouseQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockWarehouseMapper extends BaseMapper<StockWarehouse>, QueryPageMapper<StockWarehouse, StockWarehouseQueryDto> {}