package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.ProjectProject;
import com.erp.server.modules.base.dto.query.ProjectProjectQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ProjectProjectMapper extends BaseMapper<ProjectProject>, QueryPageMapper<ProjectProject, ProjectProjectQueryDto> {}