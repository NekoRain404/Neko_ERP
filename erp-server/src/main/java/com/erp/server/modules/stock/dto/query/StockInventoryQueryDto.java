package com.erp.server.modules.stock.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class StockInventoryQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private LocalDateTime date;
    private String state;
    private String locationIds;
    private Long companyId;
    private String keyword;
}