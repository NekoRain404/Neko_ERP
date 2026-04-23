package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import lombok.Data;

@Data
public class IrNoteQueryDto extends BasePageQuery {
    private String resModel;
    private Integer resId;
}
