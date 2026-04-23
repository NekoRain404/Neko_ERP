package com.erp.server.modules.stock.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("stock_warehouse")
public class StockWarehouse implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String code;
    private Long companyId;
}
