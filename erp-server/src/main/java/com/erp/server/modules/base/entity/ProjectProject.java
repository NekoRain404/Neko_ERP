package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("project_project")
public class ProjectProject implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long userId;
    @TableField(exist = false)
    private String userName;
    private Long partnerId;
    @TableField(exist = false)
    private String partnerName;
    private Long companyId;
    @TableField(exist = false)
    private String companyName;
    private LocalDate dateStart;
    private LocalDateTime date;
    private Boolean active;
}
