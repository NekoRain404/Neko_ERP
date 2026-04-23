package com.erp.server.modules.stock.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class StockInventoryLineDto implements Serializable {
    private static final long serialVersionUID = 1L;
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
