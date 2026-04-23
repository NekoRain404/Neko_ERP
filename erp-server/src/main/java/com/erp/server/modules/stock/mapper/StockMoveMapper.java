package com.erp.server.modules.stock.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.stock.entity.StockMove;
import com.erp.server.modules.stock.dto.query.StockMoveQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface StockMoveMapper extends BaseMapper<StockMove>, QueryPageMapper<StockMove, StockMoveQueryDto> {}