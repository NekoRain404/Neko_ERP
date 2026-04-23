package com.erp.server.modules.base.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class HrJobDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long departmentId;
    private String departmentName;
    private Integer noOfEmployee;
    private Long companyId;
}
