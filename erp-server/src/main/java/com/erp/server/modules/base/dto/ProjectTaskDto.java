package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.time.LocalDate;
import lombok.Data;

@Data
public class ProjectTaskDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long projectId;
    private String projectName;
    private Long userId;
    private String userName;
    private Long companyId;
    private String companyName;
    private LocalDate dateDeadline;
    private Long stageId;
    private String description;
    private Integer sequence;
}
