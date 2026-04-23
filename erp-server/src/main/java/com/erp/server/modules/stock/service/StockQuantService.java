package com.erp.server.modules.stock.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.dto.StockQuantDto;
import com.erp.server.modules.stock.dto.query.StockQuantQueryDto;
import com.erp.server.modules.stock.entity.StockQuant;
import com.erp.server.modules.stock.mapper.StockQuantMapper;
import org.springframework.stereotype.Service;

@Service
public class StockQuantService extends BaseCrudDtoService<StockQuantMapper, StockQuant, StockQuantDto, StockQuantQueryDto> {

    @Override
    public Class<StockQuant> getEntityClass() {
        return StockQuant.class;
    }

    @Override
    protected Class<StockQuantDto> getDtoClass() {
        return StockQuantDto.class;
    }
}
