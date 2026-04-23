package com.erp.server.modules.stock.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("stock_inventory_line")
public class StockInventoryLine implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long inventoryId;
    private Long locationId;
    private Long productId;
    private BigDecimal productQty;
    private BigDecimal theoreticalQty;
    private BigDecimal differenceQty;
    private String differenceState;
}
