package com.erp.server.modules.product.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class ProductProductDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long productTmplId;
    private String defaultCode;
    private String barcode;
    private Boolean active;
}
