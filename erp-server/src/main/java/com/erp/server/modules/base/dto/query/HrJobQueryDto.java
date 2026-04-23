package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class HrJobQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String departmentName;
    private String keyword;
}
