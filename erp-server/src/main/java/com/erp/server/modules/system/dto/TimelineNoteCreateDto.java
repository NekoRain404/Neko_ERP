package com.erp.server.modules.system.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class TimelineNoteCreateDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private String moduleKey;
    private Long id;
    private String content;
    private String authorName;
}
