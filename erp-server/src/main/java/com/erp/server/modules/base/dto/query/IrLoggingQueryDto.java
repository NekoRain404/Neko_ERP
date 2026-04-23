package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class IrLoggingQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    // Used by the desktop activity center to fetch only newly appended logs.
    private Long sinceId;
    // Keep the API flexible for filtered polling and lightweight summaries.
    private String type;
    private String resModel;
}
