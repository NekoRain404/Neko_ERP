package com.erp.server.modules.account.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class AccountInvoiceQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long partnerId;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private String state;
    private Long companyId;
    private BigDecimal amountUntaxed;
    private BigDecimal amountTax;
    private BigDecimal amountTotal;
    private String paymentState;
    private Integer createUid;
    private LocalDateTime createDate;
    private Integer writeUid;
    private LocalDateTime writeDate;
    private String keyword;
}