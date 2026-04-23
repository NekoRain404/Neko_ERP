package com.erp.server.modules.product.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("product_product")
public class ProductProduct implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long productTmplId;
    private String defaultCode;
    private String barcode;
    private Boolean active;
}
