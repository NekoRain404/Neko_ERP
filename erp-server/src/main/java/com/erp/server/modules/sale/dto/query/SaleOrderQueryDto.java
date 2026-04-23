package com.erp.server.modules.sale.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.Data;

@Data
public class SaleOrderQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    private Long partnerId;
    private Long userId;
    private String state;
    private LocalDate dateOrder;
}
