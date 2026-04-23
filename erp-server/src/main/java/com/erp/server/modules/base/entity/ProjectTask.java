package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.Data;

@Data
@TableName("project_task")
public class ProjectTask implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long projectId;
    @TableField(exist = false)
    private String projectName;
    private Long userId;
    @TableField(exist = false)
    private String userName;
    private Long companyId;
    @TableField(exist = false)
    private String companyName;
    private LocalDate dateDeadline;
    private Long stageId;
    private String description;
    private Integer sequence;
}
