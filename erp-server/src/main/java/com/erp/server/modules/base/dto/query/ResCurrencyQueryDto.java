package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class ResCurrencyQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    private String name;
    private String symbol;
    private Boolean active;
}
