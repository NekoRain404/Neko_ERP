package com.erp.server.modules.base.dto;

import java.io.Serializable;
import lombok.Data;

@Data
public class IrAttachmentDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String resModel;
    private Long resId;
    private byte[] datas;
    private String mimetype;
}
