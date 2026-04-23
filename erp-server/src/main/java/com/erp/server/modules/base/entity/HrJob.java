package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("hr_job")
public class HrJob implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long departmentId;
    @TableField(exist = false)
    private String departmentName;
    private Integer noOfEmployee;
    private Long companyId;
}
