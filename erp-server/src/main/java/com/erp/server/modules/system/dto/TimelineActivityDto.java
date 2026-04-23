package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimelineActivityDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private LocalDateTime timestamp;
    private String type;
    private String title;
    private String content;
    private String author;
    private String relatedRef;
}
