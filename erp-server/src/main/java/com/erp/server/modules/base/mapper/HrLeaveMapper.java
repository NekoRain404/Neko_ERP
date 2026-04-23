package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.HrLeave;
import com.erp.server.modules.base.dto.query.HrLeaveQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface HrLeaveMapper extends BaseMapper<HrLeave>, QueryPageMapper<HrLeave, HrLeaveQueryDto> {}