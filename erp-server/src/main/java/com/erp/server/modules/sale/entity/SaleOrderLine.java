package com.erp.server.modules.sale.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("sale_order_line")
public class SaleOrderLine implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private Long productId;
    private String name;
    private BigDecimal productUomQty;
    private BigDecimal priceUnit;
    private BigDecimal priceSubtotal;
    private BigDecimal priceTotal;
    private Long companyId;
    private String state;
}
