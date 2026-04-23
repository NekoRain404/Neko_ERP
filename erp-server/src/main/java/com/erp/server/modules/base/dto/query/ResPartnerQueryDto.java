package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class ResPartnerQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String email;
    private String phone;
    private Long companyId;
    private Boolean active;
    private String keyword;
}
