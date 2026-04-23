package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("res_currency")
public class ResCurrency implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String symbol;
    private java.math.BigDecimal rounding;
    private Integer decimalPlaces;
    private Boolean active;
}
