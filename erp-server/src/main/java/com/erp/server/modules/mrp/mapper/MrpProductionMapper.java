package com.erp.server.modules.mrp.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.mrp.entity.MrpProduction;
import com.erp.server.modules.mrp.dto.query.MrpProductionQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface MrpProductionMapper extends BaseMapper<MrpProduction>, QueryPageMapper<MrpProduction, MrpProductionQueryDto> {}