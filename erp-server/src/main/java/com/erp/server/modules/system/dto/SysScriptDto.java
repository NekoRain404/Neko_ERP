package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class SysScriptDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String model;
    private String eventName;
    private String scriptLang;
    private String scriptCode;
    private Integer status;
    private String remark;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
