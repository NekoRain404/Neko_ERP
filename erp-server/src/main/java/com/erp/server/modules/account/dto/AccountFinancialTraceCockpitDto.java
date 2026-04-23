package com.erp.server.modules.account.dto;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class AccountFinancialTraceCockpitDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String moduleKey;
    private Integer recordCount;
    private Integer readyCount;
    private Integer warningCount;
    private Integer missingCount;
    private Integer evidenceReadyCount;
    private Integer noteCount;
    private Integer attachmentCount;
    private Integer logCount;
    private List<String> warningKeys;
    private List<String> missingKeys;
    private List<AccountFinancialTraceRecordDto> records;
}
