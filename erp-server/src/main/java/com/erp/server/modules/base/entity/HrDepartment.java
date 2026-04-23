package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("hr_department")
public class HrDepartment implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long parentId;
    private Long managerId;
    private Long companyId;
}
