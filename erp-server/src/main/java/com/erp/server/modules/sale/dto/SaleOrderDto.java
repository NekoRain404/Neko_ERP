package com.erp.server.modules.sale.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;

@Data
public class SaleOrderDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String state;
    private LocalDateTime dateOrder;
    private Long partnerId;
    private Long userId;
    private Long companyId;
    private BigDecimal amountUntaxed;
    private BigDecimal amountTax;
    private BigDecimal amountTotal;
    private String pickingRef;
    private String invoiceRef;
    private String note;
    private Map<String, Object> extData;
}
