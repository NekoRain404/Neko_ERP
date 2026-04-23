package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CutoverRoleTaskDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String scopeType;
    private String scopeKey;
    private String scopeLabel;
    private String roleKey;
    private String roleLabel;
    private String owner;
    private String assignee;
    private String status;
    private LocalDateTime dueAt;
    private String slaStatus;
    private String note;
    private String updatedBy;
    private LocalDateTime createdAt;
}
