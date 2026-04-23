package com.erp.server.modules.sale.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class SaleOrderLineQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long orderId;
    private String keyword;
    private String state;
}
