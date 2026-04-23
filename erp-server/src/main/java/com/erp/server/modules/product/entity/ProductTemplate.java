package com.erp.server.modules.product.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("product_template")
public class ProductTemplate implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
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
