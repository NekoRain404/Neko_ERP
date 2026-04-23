package com.erp.server.modules.system.controller;

import com.erp.server.common.Result;
import com.erp.server.modules.system.dto.CutoverCloseTaskDto;
import com.erp.server.modules.system.dto.CutoverFinanceResultPackDto;
import com.erp.server.modules.system.dto.CutoverOpsBoardDto;
import com.erp.server.modules.system.dto.CutoverFinanceReviewDto;
import com.erp.server.modules.system.dto.CutoverRoleTaskDto;
import com.erp.server.modules.system.service.CutoverOpsRecordService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/system/cutover-ops")
@RequiredArgsConstructor
public class CutoverOpsController {
    private final CutoverOpsRecordService service;

    @GetMapping("/role-desk-tasks")
    public Result<List<CutoverRoleTaskDto>> listRoleDeskTasks(
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) String scopeKey,
        @RequestParam(required = false) String roleKey,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String owner,
        @RequestParam(required = false) String assignee,
        @RequestParam(required = false) String slaStatus,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Integer limit
    ) {
        return Result.success(service.listRoleTasks(scopeType, scopeKey, roleKey, status, owner, assignee, slaStatus, keyword, limit));
    }

    @PostMapping("/role-desk-tasks")
    public Result<CutoverRoleTaskDto> saveRoleDeskTask(@RequestBody CutoverRoleTaskDto dto) {
        return Result.success(service.saveRoleTask(dto));
    }

    @GetMapping("/finance-batch-reviews")
    public Result<List<CutoverFinanceReviewDto>> listFinanceBatchReviews(
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) String scopeKey,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String updatedBy,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Integer limit
    ) {
        return Result.success(service.listFinanceReviews(scopeType, scopeKey, status, updatedBy, keyword, limit));
    }

    @PostMapping("/finance-batch-reviews")
    public Result<CutoverFinanceReviewDto> saveFinanceBatchReview(@RequestBody CutoverFinanceReviewDto dto) {
        return Result.success(service.saveFinanceReview(dto));
    }

    @GetMapping("/finance-result-packs")
    public Result<List<CutoverFinanceResultPackDto>> listFinanceResultPacks(
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) String scopeKey,
        @RequestParam(required = false) String packType,
        @RequestParam(required = false) String createdBy,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Integer limit
    ) {
        return Result.success(service.listFinanceResultPacks(scopeType, scopeKey, packType, createdBy, keyword, limit));
    }

    @PostMapping("/finance-result-packs")
    public Result<CutoverFinanceResultPackDto> saveFinanceResultPack(@RequestBody CutoverFinanceResultPackDto dto) {
        return Result.success(service.saveFinanceResultPack(dto));
    }

    @GetMapping("/close-tasks")
    public Result<List<CutoverCloseTaskDto>> listCloseTasks(
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) String scopeKey,
        @RequestParam(required = false) String moduleKey,
        @RequestParam(required = false) String taskType,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Integer limit
    ) {
        return Result.success(service.listCloseTasks(scopeType, scopeKey, moduleKey, taskType, status, keyword, limit));
    }

    @PostMapping("/close-tasks")
    public Result<CutoverCloseTaskDto> saveCloseTask(@RequestBody CutoverCloseTaskDto dto) {
        return Result.success(service.saveCloseTask(dto));
    }

    @GetMapping("/board")
    public Result<CutoverOpsBoardDto> loadBoard(@RequestParam(required = false) Integer limit) {
        return Result.success(service.loadBoard(limit));
    }
}
