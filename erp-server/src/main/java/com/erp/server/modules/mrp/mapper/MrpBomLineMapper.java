package com.erp.server.modules.mrp.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.mrp.entity.MrpBomLine;
import com.erp.server.modules.mrp.dto.query.MrpBomLineQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface MrpBomLineMapper extends BaseMapper<MrpBomLine>, QueryPageMapper<MrpBomLine, MrpBomLineQueryDto> {}