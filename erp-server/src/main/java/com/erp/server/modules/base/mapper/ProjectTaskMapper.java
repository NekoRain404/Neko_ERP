package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.ProjectTask;
import com.erp.server.modules.base.dto.query.ProjectTaskQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ProjectTaskMapper extends BaseMapper<ProjectTask>, QueryPageMapper<ProjectTask, ProjectTaskQueryDto> {}