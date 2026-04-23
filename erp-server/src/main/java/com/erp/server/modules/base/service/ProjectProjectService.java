package com.erp.server.modules.base.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.entity.ProjectProject;
import com.erp.server.modules.base.dto.ProjectProjectDto;
import com.erp.server.modules.base.dto.query.ProjectProjectQueryDto;
import com.erp.server.modules.base.mapper.ProjectProjectMapper;
import org.springframework.stereotype.Service;
@Service
public class ProjectProjectService extends BaseCrudDtoService<ProjectProjectMapper, ProjectProject, ProjectProjectDto, ProjectProjectQueryDto> {
    @Override public Class<ProjectProject> getEntityClass() { return ProjectProject.class; }
    @Override protected Class<ProjectProjectDto> getDtoClass() { return ProjectProjectDto.class; }
}