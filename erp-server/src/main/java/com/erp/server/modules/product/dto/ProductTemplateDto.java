package com.erp.server.modules.product.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ProductTemplateDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String type;
    private Long categId;
    private BigDecimal listPrice;
    private BigDecimal standardPrice;
    private String defaultCode;
    private String barcode;
    private Boolean active;
    private Long companyId;
    private String description;
}
