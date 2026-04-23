package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class HrLeaveDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long employeeId;
    private String employeeName;
    private Long holidayStatusId;
    private LocalDateTime dateFrom;
    private LocalDateTime dateTo;
    private BigDecimal numberOfDays;
    private String state;
}
