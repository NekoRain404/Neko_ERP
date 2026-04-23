package com.erp.server.modules.product.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class ProductPricelistQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Boolean active;
    private Long currencyId;
    private String currencyName;
    private Long companyId;
    private String companyName;
    private String keyword;
}
