package com.erp.server.modules.stock.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.entity.StockWarehouse;
import com.erp.server.modules.stock.dto.StockWarehouseDto;
import com.erp.server.modules.stock.dto.query.StockWarehouseQueryDto;
import com.erp.server.modules.stock.mapper.StockWarehouseMapper;
import org.springframework.stereotype.Service;
@Service
public class StockWarehouseService extends BaseCrudDtoService<StockWarehouseMapper, StockWarehouse, StockWarehouseDto, StockWarehouseQueryDto> {
    @Override public Class<StockWarehouse> getEntityClass() { return StockWarehouse.class; }
    @Override protected Class<StockWarehouseDto> getDtoClass() { return StockWarehouseDto.class; }
}
