package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.IrAttachment;
import com.erp.server.modules.base.dto.query.IrAttachmentQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface IrAttachmentMapper extends BaseMapper<IrAttachment>, QueryPageMapper<IrAttachment, IrAttachmentQueryDto> {}