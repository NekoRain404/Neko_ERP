package com.erp.server.modules.base.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class HrDepartmentDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long parentId;
    private Long managerId;
    private Long companyId;
}
