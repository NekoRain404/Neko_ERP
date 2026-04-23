package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class IrLoggingDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private LocalDateTime createDate;
    private String type;
    private String name;
    private String level;
    private String message;
    private String path;
    private String line;
    private String func;
    private String metadata;
    private String resModel;
    private Integer resId;
    private Long userId;
}
