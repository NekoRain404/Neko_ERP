package com.erp.server.modules.stock.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class StockPickingDto implements Serializable {
    private static final long serialVersionUID = 1L;
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
