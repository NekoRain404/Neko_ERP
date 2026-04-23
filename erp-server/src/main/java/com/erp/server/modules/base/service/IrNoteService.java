package com.erp.server.modules.base.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.dto.IrNoteDto;
import com.erp.server.modules.base.dto.query.IrNoteQueryDto;
import com.erp.server.modules.base.entity.IrNote;
import com.erp.server.modules.base.mapper.IrNoteMapper;
import org.springframework.stereotype.Service;

@Service
public class IrNoteService extends BaseCrudDtoService<IrNoteMapper, IrNote, IrNoteDto, IrNoteQueryDto> {
    @Override public Class<IrNote> getEntityClass() { return IrNote.class; }
    @Override protected Class<IrNoteDto> getDtoClass() { return IrNoteDto.class; }
}
