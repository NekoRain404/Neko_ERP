package com.erp.server.modules.product.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class ProductCategoryDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long parentId;
    private String completeName;
}
