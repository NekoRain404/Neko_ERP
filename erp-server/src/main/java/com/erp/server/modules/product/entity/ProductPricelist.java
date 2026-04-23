package com.erp.server.modules.product.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("product_pricelist")
public class ProductPricelist implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Boolean active;
    private Long currencyId;
    private Long companyId;
}