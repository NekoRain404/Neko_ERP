package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockQuant;
import com.erp.server.modules.stock.dto.query.StockQuantQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockQuantMapper extends BaseMapper<StockQuant>, QueryPageMapper<StockQuant, StockQuantQueryDto> {}