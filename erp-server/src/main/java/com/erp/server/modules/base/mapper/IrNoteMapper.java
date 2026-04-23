package com.erp.server.modules.base.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.dto.query.IrNoteQueryDto;
import com.erp.server.modules.base.entity.IrNote;

public interface IrNoteMapper extends BaseMapper<IrNote>, QueryPageMapper<IrNote, IrNoteQueryDto> {}
