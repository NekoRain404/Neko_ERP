package com.erp.server.modules.mrp.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class MrpBomQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long productTmplId;
    private Long productId;
    private Long companyId;
    private String keyword;
}
