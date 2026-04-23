package com.erp.server.modules.system.dto.query;

import com.erp.server.common.query.BasePageQuery;
import lombok.Data;

@Data
public class SysScriptQueryDto extends BasePageQuery {
    private String model;
    private String eventName;
    private Integer status;
}
