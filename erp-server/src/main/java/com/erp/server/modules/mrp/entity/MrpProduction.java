package com.erp.server.modules.mrp.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("mrp_production")
public class MrpProduction implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String state;
    private Long productId;
    private BigDecimal productQty;
    private BigDecimal qtyProduced;
    private Long bomId;
    private Long finishedLocationId;
    private String originRef;
    private BigDecimal componentCost;
    private BigDecimal finishedCost;
    private Long companyId;
}
