package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class IrNoteDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private LocalDateTime createDate;
    private String resModel;
    private Integer resId;
    private String content;
    private String authorName;
    private Long userId;
}
