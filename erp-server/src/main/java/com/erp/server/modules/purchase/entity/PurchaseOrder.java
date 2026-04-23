package com.erp.server.modules.purchase.entity;

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
@TableName(value = "purchase_order", autoResultMap = true)
public class PurchaseOrder implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String state;
    private LocalDateTime dateOrder;
    private Long partnerId;
    private Long userId;
    private Long companyId;
    private BigDecimal amountUntaxed;
    private BigDecimal amountTax;
    private BigDecimal amountTotal;
    private String receiptRef;
    private String billRef;
    @TableField(value = "ext_data", typeHandler = JsonbMapTypeHandler.class, jdbcType = JdbcType.OTHER)
    private Map<String, Object> extData;
}
