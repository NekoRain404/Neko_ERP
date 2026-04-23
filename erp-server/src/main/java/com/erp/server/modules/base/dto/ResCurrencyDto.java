package com.erp.server.modules.base.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class ResCurrencyDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String symbol;
    private java.math.BigDecimal rounding;
    private Integer decimalPlaces;
    private Boolean active;
}
