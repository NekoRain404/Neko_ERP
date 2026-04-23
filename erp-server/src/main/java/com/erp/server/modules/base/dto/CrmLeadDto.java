package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class CrmLeadDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String type;
    private String priority;
    private Long partnerId;
    private String partnerName;
    private Long userId;
    private String userName;
    private Long companyId;
    private String companyName;
    private BigDecimal expectedRevenue;
    private BigDecimal probability;
    private Long stageId;
    private String stageName;
    private String emailFrom;
    private String phone;
    private String description;
    private Boolean active;
}
