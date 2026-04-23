package com.erp.server.modules.system.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class SysRoleDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String roleCode;
    private String roleName;
    private Integer status;
    private Integer deleted;
}
