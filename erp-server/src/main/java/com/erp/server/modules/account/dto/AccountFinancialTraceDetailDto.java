package com.erp.server.modules.account.dto;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class AccountFinancialTraceDetailDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String moduleKey;
    private AccountFinancialTraceRecordDto record;
    private List<String> explanationLines;
    private List<String> settlementLines;
    private List<AccountFinancialTraceLinkDto> relatedLinks;
}
