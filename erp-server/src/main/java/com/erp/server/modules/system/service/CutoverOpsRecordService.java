package com.erp.server.modules.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.modules.system.dto.CutoverCloseTaskDto;
import com.erp.server.modules.system.dto.CutoverCloseTaskSummaryDto;
import com.erp.server.modules.system.dto.CutoverFinanceResultPackDto;
import com.erp.server.modules.system.dto.CutoverFinanceResultPackSummaryDto;
import com.erp.server.modules.system.dto.CutoverFinanceReviewDto;
import com.erp.server.modules.system.dto.CutoverFinanceReviewSummaryDto;
import com.erp.server.modules.system.dto.CutoverOpsBoardDto;
import com.erp.server.modules.system.dto.CutoverRoleTaskDto;
import com.erp.server.modules.system.dto.CutoverRoleTaskSummaryDto;
import com.erp.server.modules.system.entity.SysCutoverCloseTask;
import com.erp.server.modules.system.entity.SysCutoverFinanceResultPack;
import com.erp.server.modules.system.entity.SysCutoverFinanceReview;
import com.erp.server.modules.system.entity.SysCutoverRoleTask;
import com.erp.server.modules.system.mapper.SysCutoverCloseTaskMapper;
import com.erp.server.modules.system.mapper.SysCutoverFinanceResultPackMapper;
import com.erp.server.modules.system.mapper.SysCutoverFinanceReviewMapper;
import com.erp.server.modules.system.mapper.SysCutoverRoleTaskMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CutoverOpsRecordService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<CutoverRoleTaskDto>> ROLE_TASK_LIST = new TypeReference<>() {};
    private static final TypeReference<List<CutoverFinanceReviewDto>> FINANCE_REVIEW_LIST = new TypeReference<>() {};
    private static final TypeReference<List<CutoverFinanceResultPackDto>> FINANCE_RESULT_PACK_LIST = new TypeReference<>() {};
    private static final TypeReference<List<CutoverCloseTaskDto>> CLOSE_TASK_LIST = new TypeReference<>() {};

    private final SysCutoverRoleTaskMapper roleTaskMapper;
    private final SysCutoverFinanceReviewMapper financeReviewMapper;
    private final SysCutoverFinanceResultPackMapper financeResultPackMapper;
    private final SysCutoverCloseTaskMapper closeTaskMapper;

    public List<CutoverRoleTaskDto> listRoleTasks(String scopeType, String scopeKey, String roleKey, Integer limit) {
        return listRoleTasks(scopeType, scopeKey, roleKey, null, null, null, null, null, limit);
    }

    public List<CutoverRoleTaskDto> listRoleTasks(
        String scopeType,
        String scopeKey,
        String roleKey,
        String status,
        String owner,
        String assignee,
        String slaStatus,
        String keyword,
        Integer limit
    ) {
        List<CutoverRoleTaskDto> rows = roleTaskMapper.selectList(
            new LambdaQueryWrapper<SysCutoverRoleTask>()
                .eq(hasText(scopeType), SysCutoverRoleTask::getScopeType, scopeType)
                .eq(hasText(scopeKey), SysCutoverRoleTask::getScopeKey, scopeKey)
                .eq(hasText(roleKey), SysCutoverRoleTask::getRoleKey, roleKey)
                .eq(hasText(status), SysCutoverRoleTask::getStatus, status)
                .eq(hasText(owner), SysCutoverRoleTask::getOwnerName, owner)
                .eq(hasText(assignee), SysCutoverRoleTask::getAssigneeName, assignee)
                .eq(hasText(slaStatus), SysCutoverRoleTask::getSlaStatus, slaStatus)
                .and(hasText(keyword), wrapper -> wrapper
                    .like(SysCutoverRoleTask::getScopeLabel, keyword)
                    .or().like(SysCutoverRoleTask::getNote, keyword)
                    .or().like(SysCutoverRoleTask::getOwnerName, keyword)
                    .or().like(SysCutoverRoleTask::getAssigneeName, keyword)
                    .or().like(SysCutoverRoleTask::getUpdatedBy, keyword)
                )
                .orderByDesc(SysCutoverRoleTask::getCreatedAt)
        ).stream().map(this::toRoleTaskDto).toList();
        return applyLimit(rows, limit);
    }

    @Transactional(rollbackFor = Exception.class)
    public CutoverRoleTaskDto saveRoleTask(CutoverRoleTaskDto dto) {
        SysCutoverRoleTask entity = dto != null && hasText(dto.getId()) ? roleTaskMapper.selectById(dto.getId()) : null;
        if (entity == null) {
            entity = new SysCutoverRoleTask();
            entity.setTaskId(hasText(dto == null ? null : dto.getId()) ? dto.getId() : buildId("role"));
            entity.setCreatedAt(dto != null && dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now());
        }
        entity.setScopeType(defaultValue(dto == null ? null : dto.getScopeType(), "global"));
        entity.setScopeKey(defaultValue(dto == null ? null : dto.getScopeKey(), "default"));
        entity.setScopeLabel(defaultValue(dto == null ? null : dto.getScopeLabel(), "-"));
        entity.setRoleKey(defaultValue(dto == null ? null : dto.getRoleKey(), "owner"));
        entity.setRoleLabel(defaultValue(dto == null ? null : dto.getRoleLabel(), "Owner"));
        entity.setOwnerName(defaultValue(dto == null ? null : dto.getOwner(), "-"));
        entity.setAssigneeName(defaultValue(dto == null ? null : dto.getAssignee(), entity.getOwnerName()));
        entity.setStatus(defaultValue(dto == null ? null : dto.getStatus(), "claimed"));
        entity.setDueAt(dto == null ? null : dto.getDueAt());
        entity.setSlaStatus(resolveSlaStatus(entity.getStatus(), entity.getDueAt()));
        entity.setNote(dto == null ? null : dto.getNote());
        entity.setUpdatedBy(dto == null ? null : dto.getUpdatedBy());
        upsertRoleTask(entity);
        return toRoleTaskDto(entity);
    }

    public List<CutoverFinanceReviewDto> listFinanceReviews(String scopeType, String scopeKey, Integer limit) {
        return listFinanceReviews(scopeType, scopeKey, null, null, null, limit);
    }

    public List<CutoverFinanceReviewDto> listFinanceReviews(
        String scopeType,
        String scopeKey,
        String status,
        String updatedBy,
        String keyword,
        Integer limit
    ) {
        List<CutoverFinanceReviewDto> rows = financeReviewMapper.selectList(
            new LambdaQueryWrapper<SysCutoverFinanceReview>()
                .eq(hasText(scopeType), SysCutoverFinanceReview::getScopeType, scopeType)
                .eq(hasText(scopeKey), SysCutoverFinanceReview::getScopeKey, scopeKey)
                .eq(hasText(status), SysCutoverFinanceReview::getStatus, status)
                .eq(hasText(updatedBy), SysCutoverFinanceReview::getUpdatedBy, updatedBy)
                .and(hasText(keyword), wrapper -> wrapper
                    .like(SysCutoverFinanceReview::getScopeLabel, keyword)
                    .or().like(SysCutoverFinanceReview::getNote, keyword)
                    .or().like(SysCutoverFinanceReview::getUpdatedBy, keyword)
                )
                .orderByDesc(SysCutoverFinanceReview::getCreatedAt)
        ).stream().map(this::toFinanceReviewDto).toList();
        return applyLimit(rows, limit);
    }

    @Transactional(rollbackFor = Exception.class)
    public CutoverFinanceReviewDto saveFinanceReview(CutoverFinanceReviewDto dto) {
        SysCutoverFinanceReview entity = dto != null && hasText(dto.getId()) ? financeReviewMapper.selectById(dto.getId()) : null;
        if (entity == null) {
            entity = new SysCutoverFinanceReview();
            entity.setReviewId(hasText(dto == null ? null : dto.getId()) ? dto.getId() : buildId("finance"));
            entity.setCreatedAt(dto != null && dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now());
        }
        entity.setScopeType(defaultValue(dto == null ? null : dto.getScopeType(), "global"));
        entity.setScopeKey(defaultValue(dto == null ? null : dto.getScopeKey(), "default"));
        entity.setScopeLabel(defaultValue(dto == null ? null : dto.getScopeLabel(), "-"));
        entity.setStatus(defaultValue(dto == null ? null : dto.getStatus(), "reviewed"));
        entity.setNote(dto == null ? null : dto.getNote());
        entity.setUpdatedBy(dto == null ? null : dto.getUpdatedBy());
        upsertFinanceReview(entity);
        return toFinanceReviewDto(entity);
    }

    public List<CutoverFinanceResultPackDto> listFinanceResultPacks(
        String scopeType,
        String scopeKey,
        String packType,
        String createdBy,
        String keyword,
        Integer limit
    ) {
        List<CutoverFinanceResultPackDto> rows = financeResultPackMapper.selectList(
            new LambdaQueryWrapper<SysCutoverFinanceResultPack>()
                .eq(hasText(scopeType), SysCutoverFinanceResultPack::getScopeType, scopeType)
                .eq(hasText(scopeKey), SysCutoverFinanceResultPack::getScopeKey, scopeKey)
                .eq(hasText(packType), SysCutoverFinanceResultPack::getPackType, packType)
                .eq(hasText(createdBy), SysCutoverFinanceResultPack::getCreatedBy, createdBy)
                .and(hasText(keyword), wrapper -> wrapper
                    .like(SysCutoverFinanceResultPack::getScopeLabel, keyword)
                    .or().like(SysCutoverFinanceResultPack::getFilename, keyword)
                    .or().like(SysCutoverFinanceResultPack::getSummary, keyword)
                    .or().like(SysCutoverFinanceResultPack::getCreatedBy, keyword)
                )
                .orderByDesc(SysCutoverFinanceResultPack::getCreatedAt)
        ).stream().map(this::toFinanceResultPackDto).toList();
        return applyLimit(rows, limit);
    }

    @Transactional(rollbackFor = Exception.class)
    public CutoverFinanceResultPackDto saveFinanceResultPack(CutoverFinanceResultPackDto dto) {
        SysCutoverFinanceResultPack entity = dto != null && hasText(dto.getId()) ? financeResultPackMapper.selectById(dto.getId()) : null;
        if (entity == null) {
            entity = new SysCutoverFinanceResultPack();
            entity.setPackId(hasText(dto == null ? null : dto.getId()) ? dto.getId() : buildId("pack"));
            entity.setCreatedAt(dto != null && dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now());
        }
        entity.setScopeType(defaultValue(dto == null ? null : dto.getScopeType(), "global"));
        entity.setScopeKey(defaultValue(dto == null ? null : dto.getScopeKey(), "default"));
        entity.setScopeLabel(defaultValue(dto == null ? null : dto.getScopeLabel(), "-"));
        entity.setPackType(defaultValue(dto == null ? null : dto.getPackType(), "panel-packet"));
        entity.setFilename(defaultValue(dto == null ? null : dto.getFilename(), "cutover_finance_pack.md"));
        entity.setRowCount(dto == null || dto.getRowCount() == null ? 0 : Math.max(dto.getRowCount(), 0));
        entity.setSummary(dto == null ? null : dto.getSummary());
        entity.setCreatedBy(dto == null ? null : dto.getCreatedBy());
        upsertFinanceResultPack(entity);
        return toFinanceResultPackDto(entity);
    }

    public List<CutoverCloseTaskDto> listCloseTasks(
        String scopeType,
        String scopeKey,
        String moduleKey,
        String taskType,
        String status,
        String keyword,
        Integer limit
    ) {
        List<CutoverCloseTaskDto> rows = closeTaskMapper.selectList(
            new LambdaQueryWrapper<SysCutoverCloseTask>()
                .eq(hasText(scopeType), SysCutoverCloseTask::getScopeType, scopeType)
                .eq(hasText(scopeKey), SysCutoverCloseTask::getScopeKey, scopeKey)
                .eq(hasText(moduleKey), SysCutoverCloseTask::getModuleKey, moduleKey)
                .eq(hasText(taskType), SysCutoverCloseTask::getTaskType, taskType)
                .eq(hasText(status), SysCutoverCloseTask::getStatus, status)
                .and(hasText(keyword), wrapper -> wrapper
                    .like(SysCutoverCloseTask::getScopeLabel, keyword)
                    .or().like(SysCutoverCloseTask::getTaskLabel, keyword)
                    .or().like(SysCutoverCloseTask::getNote, keyword)
                    .or().like(SysCutoverCloseTask::getUpdatedBy, keyword)
                )
                .orderByDesc(SysCutoverCloseTask::getCreatedAt)
        ).stream().map(this::toCloseTaskDto).toList();
        return applyLimit(rows, limit);
    }

    @Transactional(rollbackFor = Exception.class)
    public CutoverCloseTaskDto saveCloseTask(CutoverCloseTaskDto dto) {
        SysCutoverCloseTask entity = dto != null && hasText(dto.getId()) ? closeTaskMapper.selectById(dto.getId()) : null;
        if (entity == null) {
            entity = new SysCutoverCloseTask();
            entity.setTaskId(hasText(dto == null ? null : dto.getId()) ? dto.getId() : buildId("close"));
            entity.setCreatedAt(dto != null && dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now());
        }
        entity.setScopeType(defaultValue(dto == null ? null : dto.getScopeType(), "module"));
        entity.setScopeKey(defaultValue(dto == null ? null : dto.getScopeKey(), "default"));
        entity.setScopeLabel(defaultValue(dto == null ? null : dto.getScopeLabel(), "-"));
        entity.setModuleKey(defaultValue(dto == null ? null : dto.getModuleKey(), "accountMove"));
        entity.setTaskType(defaultValue(dto == null ? null : dto.getTaskType(), "review"));
        entity.setTaskLabel(defaultValue(dto == null ? null : dto.getTaskLabel(), "Review"));
        entity.setStatus(defaultValue(dto == null ? null : dto.getStatus(), "open"));
        entity.setNote(dto == null ? null : dto.getNote());
        entity.setUpdatedBy(dto == null ? null : dto.getUpdatedBy());
        upsertCloseTask(entity);
        return toCloseTaskDto(entity);
    }

    public CutoverRoleTaskSummaryDto summarizeRoleTasks() {
        List<CutoverRoleTaskDto> rows = listRoleTasks(null, null, null, null, null, null, null, null, 0);
        CutoverRoleTaskSummaryDto summary = new CutoverRoleTaskSummaryDto();
        summary.setTotalCount(rows.size());
        summary.setLatestCreatedAt(rows.isEmpty() ? null : rows.get(0).getCreatedAt());
        summary.setStatusCounts(countBy(rows, CutoverRoleTaskDto::getStatus));
        summary.setRoleCounts(countBy(rows, CutoverRoleTaskDto::getRoleLabel));
        summary.setOwnerCounts(countBy(rows, CutoverRoleTaskDto::getOwner));
        summary.setAssigneeCounts(countBy(rows, CutoverRoleTaskDto::getAssignee));
        summary.setSlaCounts(countBy(rows, CutoverRoleTaskDto::getSlaStatus));
        return summary;
    }

    public CutoverFinanceReviewSummaryDto summarizeFinanceReviews() {
        List<CutoverFinanceReviewDto> rows = listFinanceReviews(null, null, null, null, null, 0);
        CutoverFinanceReviewSummaryDto summary = new CutoverFinanceReviewSummaryDto();
        summary.setTotalCount(rows.size());
        summary.setLatestCreatedAt(rows.isEmpty() ? null : rows.get(0).getCreatedAt());
        summary.setStatusCounts(countBy(rows, CutoverFinanceReviewDto::getStatus));
        summary.setReviewerCounts(countBy(rows, CutoverFinanceReviewDto::getUpdatedBy));
        summary.setScopeTypeCounts(countBy(rows, CutoverFinanceReviewDto::getScopeType));
        return summary;
    }

    public CutoverFinanceResultPackSummaryDto summarizeFinanceResultPacks() {
        List<CutoverFinanceResultPackDto> rows = listFinanceResultPacks(null, null, null, null, null, 0);
        CutoverFinanceResultPackSummaryDto summary = new CutoverFinanceResultPackSummaryDto();
        summary.setTotalCount(rows.size());
        summary.setLatestCreatedAt(rows.isEmpty() ? null : rows.get(0).getCreatedAt());
        summary.setPackTypeCounts(countBy(rows, CutoverFinanceResultPackDto::getPackType));
        summary.setCreatorCounts(countBy(rows, CutoverFinanceResultPackDto::getCreatedBy));
        return summary;
    }

    public CutoverCloseTaskSummaryDto summarizeCloseTasks() {
        List<CutoverCloseTaskDto> rows = listCloseTasks(null, null, null, null, null, null, 0);
        CutoverCloseTaskSummaryDto summary = new CutoverCloseTaskSummaryDto();
        summary.setTotalCount(rows.size());
        summary.setLatestCreatedAt(rows.isEmpty() ? null : rows.get(0).getCreatedAt());
        summary.setStatusCounts(countBy(rows, CutoverCloseTaskDto::getStatus));
        summary.setTaskTypeCounts(countBy(rows, CutoverCloseTaskDto::getTaskType));
        summary.setModuleCounts(countBy(rows, CutoverCloseTaskDto::getModuleKey));
        return summary;
    }

    public CutoverOpsBoardDto loadBoard(Integer limit) {
        CutoverOpsBoardDto board = new CutoverOpsBoardDto();
        board.setRoleDeskTasks(listRoleTasks(null, null, null, null, null, null, null, null, limit));
        board.setFinanceBatchReviews(listFinanceReviews(null, null, null, null, null, limit));
        board.setFinanceResultPacks(listFinanceResultPacks(null, null, null, null, null, limit));
        board.setCloseTasks(listCloseTasks(null, null, null, null, null, null, limit));
        board.setRoleDeskSummary(summarizeRoleTasks());
        board.setFinanceBatchSummary(summarizeFinanceReviews());
        board.setFinanceResultPackSummary(summarizeFinanceResultPacks());
        board.setCloseTaskSummary(summarizeCloseTasks());
        return board;
    }

    @Transactional(rollbackFor = Exception.class)
    public void absorbOperationsSnapshot(Map<String, Object> configData) {
        Map<String, Object> operations = readOperations(configData);
        for (CutoverRoleTaskDto dto : convertList(operations.get("roleDeskTasks"), ROLE_TASK_LIST)) {
            saveRoleTask(dto);
        }
        for (CutoverFinanceReviewDto dto : convertList(operations.get("financeBatchReviews"), FINANCE_REVIEW_LIST)) {
            saveFinanceReview(dto);
        }
        for (CutoverFinanceResultPackDto dto : convertList(operations.get("financeResultPacks"), FINANCE_RESULT_PACK_LIST)) {
            saveFinanceResultPack(dto);
        }
        for (CutoverCloseTaskDto dto : convertList(operations.get("closeTasks"), CLOSE_TASK_LIST)) {
            saveCloseTask(dto);
        }
    }

    public Map<String, Object> mergeOperationsIntoConfigData(Map<String, Object> configData) {
        Map<String, Object> merged = configData == null ? new LinkedHashMap<>() : new LinkedHashMap<>(configData);
        Map<String, Object> operations = readOperations(merged);
        operations.put("roleDeskTasks", listRoleTasks(null, null, null, null, null, null, null, null, 240));
        operations.put("financeBatchReviews", listFinanceReviews(null, null, null, null, null, 240));
        operations.put("financeResultPacks", listFinanceResultPacks(null, null, null, null, null, 240));
        operations.put("closeTasks", listCloseTasks(null, null, null, null, null, null, 240));
        merged.put("operations", operations);
        return merged;
    }

    private void upsertRoleTask(SysCutoverRoleTask entity) {
        if (roleTaskMapper.selectById(entity.getTaskId()) == null) {
            roleTaskMapper.insert(entity);
        } else {
            roleTaskMapper.updateById(entity);
        }
    }

    private void upsertFinanceReview(SysCutoverFinanceReview entity) {
        if (financeReviewMapper.selectById(entity.getReviewId()) == null) {
            financeReviewMapper.insert(entity);
        } else {
            financeReviewMapper.updateById(entity);
        }
    }

    private void upsertFinanceResultPack(SysCutoverFinanceResultPack entity) {
        if (financeResultPackMapper.selectById(entity.getPackId()) == null) {
            financeResultPackMapper.insert(entity);
        } else {
            financeResultPackMapper.updateById(entity);
        }
    }

    private void upsertCloseTask(SysCutoverCloseTask entity) {
        if (closeTaskMapper.selectById(entity.getTaskId()) == null) {
            closeTaskMapper.insert(entity);
        } else {
            closeTaskMapper.updateById(entity);
        }
    }

    private Map<String, Object> readOperations(Map<String, Object> configData) {
        Object operations = configData == null ? null : configData.get("operations");
        if (operations instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            map.forEach((key, value) -> normalized.put(String.valueOf(key), value));
            return normalized;
        }
        return new LinkedHashMap<>();
    }

    private <T> List<T> convertList(Object value, TypeReference<List<T>> typeReference) {
        if (value == null) {
            return List.of();
        }
        try {
            List<T> rows = OBJECT_MAPPER.convertValue(value, typeReference);
            return rows == null ? List.of() : rows;
        } catch (IllegalArgumentException ex) {
            return List.of();
        }
    }

    private CutoverRoleTaskDto toRoleTaskDto(SysCutoverRoleTask entity) {
        CutoverRoleTaskDto dto = new CutoverRoleTaskDto();
        dto.setId(entity.getTaskId());
        dto.setScopeType(entity.getScopeType());
        dto.setScopeKey(entity.getScopeKey());
        dto.setScopeLabel(entity.getScopeLabel());
        dto.setRoleKey(entity.getRoleKey());
        dto.setRoleLabel(entity.getRoleLabel());
        dto.setOwner(entity.getOwnerName());
        dto.setAssignee(entity.getAssigneeName());
        dto.setStatus(entity.getStatus());
        dto.setDueAt(entity.getDueAt());
        dto.setSlaStatus(resolveSlaStatus(entity.getStatus(), entity.getDueAt()));
        dto.setNote(entity.getNote());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private CutoverFinanceReviewDto toFinanceReviewDto(SysCutoverFinanceReview entity) {
        CutoverFinanceReviewDto dto = new CutoverFinanceReviewDto();
        dto.setId(entity.getReviewId());
        dto.setScopeType(entity.getScopeType());
        dto.setScopeKey(entity.getScopeKey());
        dto.setScopeLabel(entity.getScopeLabel());
        dto.setStatus(entity.getStatus());
        dto.setNote(entity.getNote());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private CutoverFinanceResultPackDto toFinanceResultPackDto(SysCutoverFinanceResultPack entity) {
        CutoverFinanceResultPackDto dto = new CutoverFinanceResultPackDto();
        dto.setId(entity.getPackId());
        dto.setScopeType(entity.getScopeType());
        dto.setScopeKey(entity.getScopeKey());
        dto.setScopeLabel(entity.getScopeLabel());
        dto.setPackType(entity.getPackType());
        dto.setFilename(entity.getFilename());
        dto.setRowCount(entity.getRowCount());
        dto.setSummary(entity.getSummary());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private CutoverCloseTaskDto toCloseTaskDto(SysCutoverCloseTask entity) {
        CutoverCloseTaskDto dto = new CutoverCloseTaskDto();
        dto.setId(entity.getTaskId());
        dto.setScopeType(entity.getScopeType());
        dto.setScopeKey(entity.getScopeKey());
        dto.setScopeLabel(entity.getScopeLabel());
        dto.setModuleKey(entity.getModuleKey());
        dto.setTaskType(entity.getTaskType());
        dto.setTaskLabel(entity.getTaskLabel());
        dto.setStatus(entity.getStatus());
        dto.setNote(entity.getNote());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private <T> List<T> applyLimit(List<T> rows, Integer limit) {
        if (limit == null || limit <= 0 || rows.size() <= limit) {
            return rows;
        }
        return new ArrayList<>(rows.subList(0, limit));
    }

    private <T> Map<String, Long> countBy(List<T> rows, Function<T, String> keyGetter) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (T row : rows) {
            String key = defaultValue(keyGetter.apply(row), "-");
            result.put(key, result.getOrDefault(key, 0L) + 1);
        }
        return result;
    }

    private String resolveSlaStatus(String status, LocalDateTime dueAt) {
        if ("done".equalsIgnoreCase(status)) {
            return "met";
        }
        if (dueAt == null) {
            return "open";
        }
        Duration duration = Duration.between(LocalDateTime.now(), dueAt);
        if (duration.isNegative()) {
            return "overdue";
        }
        if (duration.compareTo(Duration.ofHours(6)) <= 0) {
            return "risk";
        }
        return "open";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String defaultValue(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private String buildId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
