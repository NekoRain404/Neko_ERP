package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class ProjectProjectQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String userName;
    private String partnerName;
    private String companyName;
    private String keyword;
}
