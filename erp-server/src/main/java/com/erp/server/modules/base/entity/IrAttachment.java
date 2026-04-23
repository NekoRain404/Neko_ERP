package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ir_attachment")
public class IrAttachment implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String resModel;
    private Long resId;
    private byte[] datas;
    private String mimetype;
    private LocalDateTime createDate;
    private Long userId;
}
