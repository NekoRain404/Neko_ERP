package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockInventory;
import com.erp.server.modules.stock.dto.query.StockInventoryQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockInventoryMapper extends BaseMapper<StockInventory>, QueryPageMapper<StockInventory, StockInventoryQueryDto> {}