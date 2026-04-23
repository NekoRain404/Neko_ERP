package com.erp.server.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("sys_cutover_finance_result_pack")
public class SysCutoverFinanceResultPack implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "pack_id", type = IdType.INPUT)
    private String packId;

    private String scopeType;
    private String scopeKey;
    private String scopeLabel;
    private String packType;
    private String filename;
    private Integer rowCount;
    private String summary;
    private String createdBy;
    private LocalDateTime createdAt;
}
