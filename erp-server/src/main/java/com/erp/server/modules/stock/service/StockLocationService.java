package com.erp.server.modules.stock.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.entity.StockLocation;
import com.erp.server.modules.stock.dto.StockLocationDto;
import com.erp.server.modules.stock.dto.query.StockLocationQueryDto;
import com.erp.server.modules.stock.mapper.StockLocationMapper;
import org.springframework.stereotype.Service;
@Service
public class StockLocationService extends BaseCrudDtoService<StockLocationMapper, StockLocation, StockLocationDto, StockLocationQueryDto> {
    @Override public Class<StockLocation> getEntityClass() { return StockLocation.class; }
    @Override protected Class<StockLocationDto> getDtoClass() { return StockLocationDto.class; }
}
