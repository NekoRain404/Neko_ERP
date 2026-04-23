package com.erp.server.modules.account.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.erp.server.common.typehandler.JsonbMapTypeHandler;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import org.apache.ibatis.type.JdbcType;

@Data
@TableName(value = "account_move", autoResultMap = true)
public class AccountMove implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String ref;
    private String state;
    private String moveType;
    private LocalDateTime date;
    private Long partnerId;
    private Long journalId;
    private String reversedEntryRef;
    private String reversedFromRef;
    private Long companyId;
    private BigDecimal amountTotal;
    @TableField(value = "ext_data", typeHandler = JsonbMapTypeHandler.class, jdbcType = JdbcType.OTHER)
    private Map<String, Object> extData;
}
