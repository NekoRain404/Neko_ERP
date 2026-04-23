package com.erp.server.modules.system.dto;

import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;

@Data
public class CutoverConfigDto {
    private String configKey;
    private Map<String, Object> configData;
    private LocalDateTime updatedTime;
    private String updatedBy;
}
