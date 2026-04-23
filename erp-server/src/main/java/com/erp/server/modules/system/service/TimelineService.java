package com.erp.server.modules.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.modules.base.entity.IrAttachment;
import com.erp.server.modules.base.entity.IrLogging;
import com.erp.server.modules.base.entity.IrNote;
import com.erp.server.modules.base.mapper.IrAttachmentMapper;
import com.erp.server.modules.base.mapper.IrLoggingMapper;
import com.erp.server.modules.base.mapper.IrNoteMapper;
import com.erp.server.modules.system.dto.TimelineActivityDto;
import com.erp.server.modules.system.dto.TimelineNoteCreateDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TimelineService {

    private final IrLoggingMapper irLoggingMapper;
    private final IrNoteMapper irNoteMapper;
    private final IrAttachmentMapper irAttachmentMapper;

    public List<TimelineActivityDto> getTimeline(String moduleKey, Long id) {
        List<String> modelNames = resolveModelNames(moduleKey);
        Integer resId = id == null ? null : id.intValue();
        if (modelNames.isEmpty() || resId == null) {
            return List.of();
        }

        List<TimelineActivityDto> activities = new ArrayList<>();
        activities.addAll(loadLogs(modelNames, resId));
        activities.addAll(loadNotes(modelNames, resId));
        activities.addAll(loadAttachments(modelNames, resId));
        activities.sort(
            Comparator.comparing(TimelineActivityDto::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(TimelineActivityDto::getType)
        );
        return activities;
    }

    @Transactional(rollbackFor = Exception.class)
    public Long addNote(TimelineNoteCreateDto request) {
        String modelName = resolvePrimaryModelName(request.getModuleKey());
        if (modelName == null || request.getId() == null || request.getContent() == null || request.getContent().isBlank()) {
            throw new RuntimeException("时间轴便签参数不完整");
        }
        IrNote note = new IrNote();
        note.setCreateDate(LocalDateTime.now());
        note.setResModel(modelName);
        note.setResId(request.getId().intValue());
        note.setContent(request.getContent().trim());
        note.setAuthorName(request.getAuthorName() == null || request.getAuthorName().isBlank() ? "NEKO_ERP" : request.getAuthorName().trim());
        irNoteMapper.insert(note);
        return note.getId();
    }

    private List<TimelineActivityDto> loadLogs(List<String> modelNames, Integer resId) {
        return irLoggingMapper.selectList(
            new LambdaQueryWrapper<IrLogging>()
                .in(IrLogging::getResModel, modelNames)
                .eq(IrLogging::getResId, resId)
                .orderByDesc(IrLogging::getCreateDate)
        ).stream().map(log -> new TimelineActivityDto(
            log.getCreateDate(),
            "system",
            log.getType() == null ? "SYSTEM" : log.getType(),
            log.getMessage(),
            log.getUserId() == null ? "System" : "User#" + log.getUserId(),
            log.getMetadata()
        )).toList();
    }

    private List<TimelineActivityDto> loadNotes(List<String> modelNames, Integer resId) {
        return irNoteMapper.selectList(
            new LambdaQueryWrapper<IrNote>()
                .in(IrNote::getResModel, modelNames)
                .eq(IrNote::getResId, resId)
                .orderByDesc(IrNote::getCreateDate)
        ).stream().map(note -> new TimelineActivityDto(
            note.getCreateDate(),
            "note",
            "Note",
            note.getContent(),
            note.getAuthorName(),
            null
        )).toList();
    }

    private List<TimelineActivityDto> loadAttachments(List<String> modelNames, Integer resId) {
        return irAttachmentMapper.selectList(
            new LambdaQueryWrapper<IrAttachment>()
                .in(IrAttachment::getResModel, modelNames)
                .eq(IrAttachment::getResId, Long.valueOf(resId))
                .orderByDesc(IrAttachment::getCreateDate)
        ).stream().map(attachment -> new TimelineActivityDto(
            attachment.getCreateDate(),
            "attachment",
            "Attachment",
            attachment.getName(),
            attachment.getUserId() == null ? "System" : "User#" + attachment.getUserId(),
            attachment.getMimetype()
        )).toList();
    }

    private String resolvePrimaryModelName(String moduleKey) {
        if (moduleKey == null || moduleKey.isBlank()) {
            return null;
        }
        return Character.toUpperCase(moduleKey.charAt(0)) + moduleKey.substring(1);
    }

    private List<String> resolveModelNames(String moduleKey) {
        if (moduleKey == null || moduleKey.isBlank()) {
            return List.of();
        }
        String trimmed = moduleKey.trim();
        Set<String> names = new LinkedHashSet<>();
        names.add(resolvePrimaryModelName(trimmed));
        names.add(Character.toLowerCase(trimmed.charAt(0)) + trimmed.substring(1));
        return names.stream().filter(value -> value != null && !value.isBlank()).toList();
    }
}
