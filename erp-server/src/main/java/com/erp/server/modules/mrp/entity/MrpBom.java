package com.erp.server.modules.mrp.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("mrp_bom")
public class MrpBom implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long productTmplId;
    private Long productId;
    private String code;
    private BigDecimal productQty;
    private Long companyId;
}
