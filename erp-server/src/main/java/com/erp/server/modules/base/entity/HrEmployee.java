package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("hr_employee")
public class HrEmployee implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long jobId;
    @TableField(exist = false)
    private String jobName;
    private Long departmentId;
    @TableField(exist = false)
    private String departmentName;
    private Long parentId;
    private Long userId;
    @TableField(exist = false)
    private String userName;
    private Long companyId;
    @TableField(exist = false)
    private String companyName;
    private String workEmail;
    private String workPhone;
    private Boolean active;
}
