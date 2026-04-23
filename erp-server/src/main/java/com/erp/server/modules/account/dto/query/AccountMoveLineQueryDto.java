package com.erp.server.modules.account.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class AccountMoveLineQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long moveId;
    private Long accountId;
    private Long productId;
    private String reconciled;
    private String paymentRef;
    private String keyword;
}
