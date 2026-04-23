package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockPicking;
import com.erp.server.modules.stock.dto.query.StockPickingQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockPickingMapper extends BaseMapper<StockPicking>, QueryPageMapper<StockPicking, StockPickingQueryDto> {}