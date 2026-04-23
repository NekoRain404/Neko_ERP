package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockLocation;
import com.erp.server.modules.stock.dto.query.StockLocationQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockLocationMapper extends BaseMapper<StockLocation>, QueryPageMapper<StockLocation, StockLocationQueryDto> {}