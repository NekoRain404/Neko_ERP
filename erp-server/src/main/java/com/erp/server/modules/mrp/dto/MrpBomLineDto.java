package com.erp.server.modules.mrp.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class MrpBomLineDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long bomId;
    private Long productId;
    private BigDecimal productQty;
    private Long companyId;
}
