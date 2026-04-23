package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ProjectProjectDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long userId;
    private String userName;
    private Long partnerId;
    private String partnerName;
    private Long companyId;
    private String companyName;
    private LocalDate dateStart;
    private LocalDateTime date;
    private Boolean active;
}
