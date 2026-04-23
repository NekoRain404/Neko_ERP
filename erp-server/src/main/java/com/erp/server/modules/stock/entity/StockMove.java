package com.erp.server.modules.stock.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("stock_move")
public class StockMove implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long pickingId;
    private Long productionId;
    private Long productId;
    private BigDecimal productUomQty;
    private BigDecimal quantity;
    private Long locationId;
    private Long locationDestId;
    private String originRef;
    private String sourceLineRef;
    private String moveRole;
    private BigDecimal unitCost;
    private BigDecimal totalCost;
    private Long companyId;
    private String state;
}
