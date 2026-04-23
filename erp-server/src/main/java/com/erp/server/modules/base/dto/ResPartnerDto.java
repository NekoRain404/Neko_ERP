package com.erp.server.modules.base.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;
import lombok.Data;

@Data
public class ResPartnerDto implements Serializable {
    private static final long serialVersionUID = 1L;
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
    private Map<String, Object> extData;
}
