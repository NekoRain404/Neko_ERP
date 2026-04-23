package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.IrAttachment;
import com.erp.server.modules.base.dto.IrAttachmentDto;
import com.erp.server.modules.base.dto.query.IrAttachmentQueryDto;
import com.erp.server.modules.base.mapper.IrAttachmentMapper;
import org.springframework.stereotype.Service;
@Service
public class IrAttachmentService extends BaseCrudDtoService<IrAttachmentMapper, IrAttachment, IrAttachmentDto, IrAttachmentQueryDto> {
    @Override public Class<IrAttachment> getEntityClass() { return IrAttachment.class; }
    @Override protected Class<IrAttachmentDto> getDtoClass() { return IrAttachmentDto.class; }
}