package com.erp.server.common.query;

import lombok.Data;

import java.io.Serializable;

@Data
public class BasePageQuery implements Serializable {
    private static final long serialVersionUID = 1L;

    private long current = 1L;
    private long size = 10L;
    private String keyword;
}
