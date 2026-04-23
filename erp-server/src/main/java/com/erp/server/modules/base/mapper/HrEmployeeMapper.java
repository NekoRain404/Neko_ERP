package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.HrEmployee;
import com.erp.server.modules.base.dto.query.HrEmployeeQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface HrEmployeeMapper extends BaseMapper<HrEmployee>, QueryPageMapper<HrEmployee, HrEmployeeQueryDto> {}