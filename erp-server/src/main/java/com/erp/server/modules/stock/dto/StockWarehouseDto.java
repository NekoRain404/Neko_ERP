package com.erp.server.modules.stock.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class StockWarehouseDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String code;
    private Long companyId;
}
