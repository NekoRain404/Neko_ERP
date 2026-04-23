package com.erp.server.modules.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("sys_role")
public class SysRole implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String roleCode;
    private String roleName;
    private Integer status;
    private Integer deleted;
}
