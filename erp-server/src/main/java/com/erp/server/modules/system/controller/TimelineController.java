package com.erp.server.modules.system.controller;

import com.erp.server.common.Result;
import com.erp.server.modules.system.dto.TimelineActivityDto;
import com.erp.server.modules.system.dto.TimelineNoteCreateDto;
import com.erp.server.modules.system.service.TimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/system/timeline")
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;

    @GetMapping
    public Result<List<TimelineActivityDto>> list(@RequestParam String moduleKey, @RequestParam Long id) {
        return Result.success(timelineService.getTimeline(moduleKey, id));
    }

    @PostMapping("/note")
    public Result<Long> addNote(@RequestBody TimelineNoteCreateDto request) {
        return Result.success(timelineService.addNote(request));
    }
}
