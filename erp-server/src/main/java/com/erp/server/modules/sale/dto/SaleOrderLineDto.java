package com.erp.server.modules.sale.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class SaleOrderLineDto implements Serializable {
    private static final long serialVersionUID = 1L;
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
