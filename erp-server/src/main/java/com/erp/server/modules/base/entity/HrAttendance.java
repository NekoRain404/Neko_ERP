package com.erp.server.modules.base.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("hr_attendance")
public class HrAttendance implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Long employeeId;
    @TableField(exist = false)
    private String employeeName;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private BigDecimal workedHours;
}
