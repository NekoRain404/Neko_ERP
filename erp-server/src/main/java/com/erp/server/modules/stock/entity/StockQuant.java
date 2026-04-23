package com.erp.server.modules.stock.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("stock_quant")
public class StockQuant implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long productId;
    private Long locationId;
    private BigDecimal quantity;
    private Long companyId;
}
