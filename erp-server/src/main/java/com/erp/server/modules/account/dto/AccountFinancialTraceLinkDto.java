package com.erp.server.modules.account.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class AccountFinancialTraceLinkDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String relationType;
    private String label;
    private String moduleKey;
    private Long recordId;
    private String ref;
}
