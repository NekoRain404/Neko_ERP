package com.erp.server.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.erp.server.common.typehandler.JsonbMapTypeHandler;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import org.apache.ibatis.type.JdbcType;

@Data
@TableName(value = "sys_cutover_config", autoResultMap = true)
public class SysCutoverConfig implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "config_key", type = IdType.INPUT)
    private String configKey;

    @TableField(value = "config_data", typeHandler = JsonbMapTypeHandler.class, jdbcType = JdbcType.OTHER)
    private Map<String, Object> configData;

    private LocalDateTime updatedTime;
    private String updatedBy;
}
