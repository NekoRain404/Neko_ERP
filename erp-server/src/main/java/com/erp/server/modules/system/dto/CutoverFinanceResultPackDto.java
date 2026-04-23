package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CutoverFinanceResultPackDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String scopeType;
    private String scopeKey;
    private String scopeLabel;
    private String packType;
    private String filename;
    private Integer rowCount;
    private String summary;
    private String createdBy;
    private LocalDateTime createdAt;
}
