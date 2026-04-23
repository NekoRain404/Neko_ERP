package com.erp.server.modules.product.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class ProductPricelistDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Boolean active;
    private Long currencyId;
    private Long companyId;
}