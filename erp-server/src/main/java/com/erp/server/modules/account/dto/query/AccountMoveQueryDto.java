package com.erp.server.modules.account.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.Data;

@Data
public class AccountMoveQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    private String ref;
    private Long partnerId;
    private Long journalId;
    private String state;
    private LocalDate date;
}
