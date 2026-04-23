package com.erp.server.modules.stock.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("stock_picking")
public class StockPicking implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String state;
    private Long partnerId;
    private String origin;
    private LocalDateTime scheduledDate;
    private LocalDateTime dateDone;
    private Long locationId;
    private Long locationDestId;
    private Long companyId;
}
