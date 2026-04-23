package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.erp.server.common.typehandler.JsonbMapTypeHandler;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;
import lombok.Data;
import org.apache.ibatis.type.JdbcType;

@Data
@TableName(value = "res_partner", autoResultMap = true)
public class ResPartner implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String type;
    private Long parentId;
    private Boolean active;
    private Boolean isCompany;
    private Long userId;
    private Long companyId;
    private String email;
    private String phone;
    private String website;
    private String vat;
    private BigDecimal creditLimit;
    private String comment;
    @TableField(value = "ext_data", typeHandler = JsonbMapTypeHandler.class, jdbcType = JdbcType.OTHER)
    private Map<String, Object> extData;
}
