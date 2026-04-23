package com.erp.server.modules.purchase.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("purchase_order_line")
public class PurchaseOrderLine implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private Long productId;
    private String name;
    private BigDecimal productQty;
    private BigDecimal priceUnit;
    private BigDecimal priceSubtotal;
    private BigDecimal priceTotal;
    private Long companyId;
    private String state;
}
