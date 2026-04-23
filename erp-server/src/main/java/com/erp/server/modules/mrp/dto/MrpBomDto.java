package com.erp.server.modules.mrp.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class MrpBomDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long productTmplId;
    private Long productId;
    private String code;
    private BigDecimal productQty;
    private Long companyId;
}
