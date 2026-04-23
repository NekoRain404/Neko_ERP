package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CutoverCloseTaskDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String scopeType;
    private String scopeKey;
    private String scopeLabel;
    private String moduleKey;
    private String taskType;
    private String taskLabel;
    private String status;
    private String note;
    private String updatedBy;
    private LocalDateTime createdAt;
}
