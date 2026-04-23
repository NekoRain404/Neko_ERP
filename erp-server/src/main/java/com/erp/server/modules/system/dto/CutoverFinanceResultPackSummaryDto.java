package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

@Data
public class CutoverFinanceResultPackSummaryDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private int totalCount;
    private LocalDateTime latestCreatedAt;
    private Map<String, Long> packTypeCounts = new LinkedHashMap<>();
    private Map<String, Long> creatorCounts = new LinkedHashMap<>();
}
