package com.erp.server.modules.account.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("account_move_line")
public class AccountMoveLine implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long moveId;
    private String name;
    private Long accountId;
    private Long productId;
    private BigDecimal debit;
    private BigDecimal credit;
    private BigDecimal balance;
    private BigDecimal residualAmount;
    private String reconciled;
    private String paymentRef;
    private Long companyId;
}
