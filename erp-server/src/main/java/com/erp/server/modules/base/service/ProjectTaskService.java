package com.erp.server.modules.base.service;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.base.dto.ProjectTaskDto;
import com.erp.server.modules.base.dto.query.ProjectTaskQueryDto;
import com.erp.server.modules.base.entity.ProjectTask;
import com.erp.server.modules.base.mapper.ProjectTaskMapper;
import java.io.Serializable;
import org.springframework.stereotype.Service;

@Service
public class ProjectTaskService extends BaseCrudDtoService<ProjectTaskMapper, ProjectTask, ProjectTaskDto, ProjectTaskQueryDto> {
    @Override public Class<ProjectTask> getEntityClass() { return ProjectTask.class; }
    @Override protected Class<ProjectTaskDto> getDtoClass() { return ProjectTaskDto.class; }

    @Override
    protected void beforeSaveDto(ProjectTaskDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, ProjectTaskDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(ProjectTaskDto dto) {
        if (dto.getStageId() == null) {
            dto.setStageId(1L);
        }
        if (dto.getSequence() == null) {
            dto.setSequence(10);
        }
    }

    @Override
    public boolean executeAction(Long id, String action) {
        ProjectTask task = getById(id);
        if (task == null) {
            return false;
        }
        if ("action_start".equals(action)) {
            task.setStageId(2L);
            task.setSequence(50);
            return updateById(task);
        }
        if ("action_done".equals(action)) {
            task.setStageId(3L);
            task.setSequence(100);
            return updateById(task);
        }
        if ("action_cancel".equals(action)) {
            task.setStageId(0L);
            task.setSequence(0);
            return updateById(task);
        }
        return super.executeAction(id, action);
    }
}
