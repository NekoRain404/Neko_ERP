package com.erp.server.modules.account.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import lombok.Data;

@Data
public class AccountFinancialTraceRecordDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String ref;
    private String state;
    private String status;
    private String originRef;
    private String invoiceRef;
    private String paymentRef;
    private String paymentState;
    private String journalEntryRef;
    private String reversedEntryRef;
    private String reversedFromRef;
    private String reconcileContext;
    private Integer lineCount;
    private Integer matchedLineCount;
    private Integer openLineCount;
    private Integer noteCount;
    private Integer attachmentCount;
    private Integer logCount;
    private BigDecimal amount;
    private List<String> warningKeys;
    private List<String> missingKeys;
}
