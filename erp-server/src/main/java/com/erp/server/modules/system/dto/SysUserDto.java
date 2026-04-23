package com.erp.server.modules.system.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class SysUserDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String username;
    private String password;
    private String realName;
    private Long partnerId;
    private Integer status;
    private Integer deleted;
}
