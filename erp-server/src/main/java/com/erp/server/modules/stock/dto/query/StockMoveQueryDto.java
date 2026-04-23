package com.erp.server.modules.stock.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class StockMoveQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long pickingId;
    private Long productionId;
    private Long productId;
    private String originRef;
    private String sourceLineRef;
    private String moveRole;
    private String keyword;
    private String state;
}
