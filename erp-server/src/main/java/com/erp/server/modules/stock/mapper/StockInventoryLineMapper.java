package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockInventoryLine;
import com.erp.server.modules.stock.dto.query.StockInventoryLineQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockInventoryLineMapper extends BaseMapper<StockInventoryLine>, QueryPageMapper<StockInventoryLine, StockInventoryLineQueryDto> {}