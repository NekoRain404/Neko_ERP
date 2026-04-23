package com.erp.server.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("sys_script")
public class SysScript implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
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
