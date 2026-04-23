package com.erp.server.modules.stock.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class StockLocationDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String usage;
    private Long warehouseId;
    private Long companyId;
}
