package com.erp.server.modules.account.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class AccountJournalDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String code;
    private String type;
    private Long companyId;
    private Long currencyId;
}
