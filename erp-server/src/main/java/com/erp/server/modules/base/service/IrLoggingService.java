package com.erp.server.modules.base.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.dto.IrLoggingDto;
import com.erp.server.modules.base.dto.query.IrLoggingQueryDto;
import com.erp.server.modules.base.entity.IrLogging;
import com.erp.server.modules.base.mapper.IrLoggingMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IrLoggingService extends BaseCrudDtoService<IrLoggingMapper, IrLogging, IrLoggingDto, IrLoggingQueryDto> {
    @Override public Class<IrLogging> getEntityClass() { return IrLogging.class; }
    @Override protected Class<IrLoggingDto> getDtoClass() { return IrLoggingDto.class; }

    public List<IrLoggingDto> listRecent(IrLoggingQueryDto query) {
        IrLoggingQueryDto safeQuery = query == null ? new IrLoggingQueryDto() : query;
        long current = Math.max(safeQuery.getCurrent(), 1L);
        long size = Math.max(safeQuery.getSize(), 1L);
        return this.baseMapper.selectPageByQuery(new Page<>(current, size), safeQuery)
            .getRecords()
            .stream()
            .map(this::toDto)
            .toList();
    }
}
