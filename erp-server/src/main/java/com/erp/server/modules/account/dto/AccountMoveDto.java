package com.erp.server.modules.account.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class AccountMoveDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String ref;
    private String state;
    private String moveType;
    private LocalDateTime date;
    private Long partnerId;
    private Long journalId;
    private String reversedEntryRef;
    private String reversedFromRef;
    private Long companyId;
    private BigDecimal amountTotal;
    private List<AccountMoveLineDto> lineIds;
    private Map<String, Object> extData;
}
