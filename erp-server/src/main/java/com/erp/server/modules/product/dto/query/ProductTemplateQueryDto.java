package com.erp.server.modules.product.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class ProductTemplateQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String defaultCode;
    private String categName;
    private Long companyId;
    private Boolean active;
    private String keyword;
}
