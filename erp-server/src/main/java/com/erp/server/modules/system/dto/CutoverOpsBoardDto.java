package com.erp.server.modules.system.dto;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class CutoverOpsBoardDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private List<CutoverRoleTaskDto> roleDeskTasks = new ArrayList<>();
    private List<CutoverFinanceReviewDto> financeBatchReviews = new ArrayList<>();
    private List<CutoverFinanceResultPackDto> financeResultPacks = new ArrayList<>();
    private List<CutoverCloseTaskDto> closeTasks = new ArrayList<>();
    private CutoverRoleTaskSummaryDto roleDeskSummary = new CutoverRoleTaskSummaryDto();
    private CutoverFinanceReviewSummaryDto financeBatchSummary = new CutoverFinanceReviewSummaryDto();
    private CutoverFinanceResultPackSummaryDto financeResultPackSummary = new CutoverFinanceResultPackSummaryDto();
    private CutoverCloseTaskSummaryDto closeTaskSummary = new CutoverCloseTaskSummaryDto();
}
