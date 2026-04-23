package com.erp.server.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("sys_cutover_role_task")
public class SysCutoverRoleTask implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "task_id", type = IdType.INPUT)
    private String taskId;

    private String scopeType;
    private String scopeKey;
    private String scopeLabel;
    private String roleKey;
    private String roleLabel;
    private String ownerName;
    private String assigneeName;
    private String status;
    private LocalDateTime dueAt;
    private String slaStatus;
    private String note;
    private String updatedBy;
    private LocalDateTime createdAt;
}
