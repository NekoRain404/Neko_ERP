package com.erp.server.modules.account.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;

@Data
public class AccountPaymentDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String state;
    private String paymentType;
    private Long partnerId;
    private BigDecimal amount;
    private Long currencyId;
    private LocalDate date;
    private Long journalId;
    private String memo;
    private String invoiceRef;
    private String originRef;
    private String journalEntryRef;
    private Long companyId;
}
