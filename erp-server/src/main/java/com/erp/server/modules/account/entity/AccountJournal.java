package com.erp.server.modules.account.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("account_journal")
public class AccountJournal implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String code;
    private String type;
    private Long companyId;
    private Long currencyId;
}
