package com.erp.server.modules.mrp.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.mrp.entity.MrpBom;
import com.erp.server.modules.mrp.dto.query.MrpBomQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface MrpBomMapper extends BaseMapper<MrpBom>, QueryPageMapper<MrpBom, MrpBomQueryDto> {}