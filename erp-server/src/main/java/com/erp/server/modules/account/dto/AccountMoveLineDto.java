package com.erp.server.modules.account.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class AccountMoveLineDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long moveId;
    private String name;
    private Long accountId;
    private Long productId;
    private BigDecimal debit;
    private BigDecimal credit;
    private BigDecimal balance;
    private BigDecimal residualAmount;
    private String reconciled;
    private String paymentRef;
    private Long companyId;
}
