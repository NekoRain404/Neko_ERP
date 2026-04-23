package com.erp.server.modules.stock.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class StockInventoryLineQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long inventoryId;
    private Long locationId;
    private Long productId;
    private BigDecimal productQty;
    private BigDecimal theoreticalQty;
    private String differenceState;
    private String keyword;
}
