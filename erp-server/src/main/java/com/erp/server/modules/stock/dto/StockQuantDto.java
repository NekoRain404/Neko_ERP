package com.erp.server.modules.stock.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class StockQuantDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long productId;
    private Long locationId;
    private BigDecimal quantity;
    private Long companyId;
}
