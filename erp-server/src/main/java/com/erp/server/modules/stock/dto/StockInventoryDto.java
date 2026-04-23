package com.erp.server.modules.stock.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class StockInventoryDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private LocalDateTime date;
    private String state;
    private String locationIds;
    private Long companyId;
}