package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReminderItemDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String type;
    private String severity;
    private String title;
    private String content;
    private String moduleKey;
    private Long recordId;
    private String relatedRef;
    private LocalDateTime createdAt;
}
