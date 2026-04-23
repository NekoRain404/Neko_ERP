package com.erp.server.modules.base.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class HrEmployeeDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long jobId;
    private String jobName;
    private Long departmentId;
    private String departmentName;
    private Long parentId;
    private Long userId;
    private String userName;
    private Long companyId;
    private String companyName;
    private String workEmail;
    private String workPhone;
    private Boolean active;
}
