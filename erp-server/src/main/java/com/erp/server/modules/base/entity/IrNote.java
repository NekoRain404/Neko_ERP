package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ir_note")
public class IrNote implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private LocalDateTime createDate;
    private String resModel;
    private Integer resId;
    private String content;
    private String authorName;
    private Long userId;
}
