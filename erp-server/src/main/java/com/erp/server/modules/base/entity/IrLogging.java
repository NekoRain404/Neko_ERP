package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ir_logging")
public class IrLogging implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
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
