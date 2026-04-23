package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.IrLogging;
import com.erp.server.modules.base.dto.query.IrLoggingQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface IrLoggingMapper extends BaseMapper<IrLogging>, QueryPageMapper<IrLogging, IrLoggingQueryDto> {}