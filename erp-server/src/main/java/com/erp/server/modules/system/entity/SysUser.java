package com.erp.server.modules.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("sys_user")
public class SysUser implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String username;
    private String password;
    private String realName;
    private Long partnerId;
    private Integer status;
    private Integer deleted;
}
