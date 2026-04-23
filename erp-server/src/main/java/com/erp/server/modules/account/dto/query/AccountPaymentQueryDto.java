package com.erp.server.modules.account.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class AccountPaymentQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    private String paymentType;
    private String state;
    private String invoiceRef;
    private String originRef;
    private String journalEntryRef;
}
