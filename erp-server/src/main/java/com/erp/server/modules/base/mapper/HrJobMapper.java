package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.HrJob;
import com.erp.server.modules.base.dto.query.HrJobQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface HrJobMapper extends BaseMapper<HrJob>, QueryPageMapper<HrJob, HrJobQueryDto> {}