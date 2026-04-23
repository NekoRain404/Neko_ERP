package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.HrDepartment;
import com.erp.server.modules.base.dto.query.HrDepartmentQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface HrDepartmentMapper extends BaseMapper<HrDepartment>, QueryPageMapper<HrDepartment, HrDepartmentQueryDto> {}