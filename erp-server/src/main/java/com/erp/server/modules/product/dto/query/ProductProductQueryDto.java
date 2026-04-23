package com.erp.server.modules.product.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class ProductProductQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    private String defaultCode;
    private String barcode;
    private Long productTmplId;
    private String productTmplName;
    private Boolean active;
}
