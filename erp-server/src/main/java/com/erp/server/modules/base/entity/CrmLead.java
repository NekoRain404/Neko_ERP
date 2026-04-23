package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("crm_lead")
public class CrmLead implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String type;
    private String priority;
    private Long partnerId;
    @TableField(exist = false)
    private String partnerName;
    private Long userId;
    @TableField(exist = false)
    private String userName;
    private Long companyId;
    @TableField(exist = false)
    private String companyName;
    private BigDecimal expectedRevenue;
    private BigDecimal probability;
    private Long stageId;
    @TableField(exist = false)
    private String stageName;
    private String emailFrom;
    private String phone;
    private String description;
    private Boolean active;
}
