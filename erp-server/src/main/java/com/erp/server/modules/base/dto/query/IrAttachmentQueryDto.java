package com.erp.server.modules.base.dto.query;

import com.erp.server.common.query.BasePageQuery;
import java.io.Serializable;
import lombok.Data;

@Data
public class IrAttachmentQueryDto extends BasePageQuery {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String keyword;
    private String resModel;
    private Long resId;

    public String getResModelAlt() {
        if (resModel == null || resModel.isBlank()) {
            return null;
        }
        String normalized = resModel.trim();
        if (normalized.length() == 1) {
            return normalized.toUpperCase();
        }
        String firstUpper = Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
        String firstLower = Character.toLowerCase(normalized.charAt(0)) + normalized.substring(1);
        return normalized.equals(firstUpper) ? firstLower : firstUpper;
    }
}
