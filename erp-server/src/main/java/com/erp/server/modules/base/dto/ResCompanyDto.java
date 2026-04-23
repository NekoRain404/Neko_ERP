package com.erp.server.modules.base.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class ResCompanyDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Long partnerId;
    private Long currencyId;
    private Boolean active;
}
