package com.erp.server.modules.stock.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.entity.StockMove;
import com.erp.server.modules.stock.dto.StockMoveDto;
import com.erp.server.modules.stock.dto.query.StockMoveQueryDto;
import com.erp.server.modules.stock.mapper.StockMoveMapper;
import org.springframework.stereotype.Service;
@Service
public class StockMoveService extends BaseCrudDtoService<StockMoveMapper, StockMove, StockMoveDto, StockMoveQueryDto> {
    @Override public Class<StockMove> getEntityClass() { return StockMove.class; }
    @Override protected Class<StockMoveDto> getDtoClass() { return StockMoveDto.class; }
}
