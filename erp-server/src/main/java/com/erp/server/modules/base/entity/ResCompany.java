package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import lombok.Data;

@Data
@TableName("res_company")
public class ResCompany implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long partnerId;
    private Long currencyId;
    private Boolean active;
}
