package com.erp.server.modules.system.controller;

import com.erp.server.common.Result;
import com.erp.server.modules.system.dto.ReminderItemDto;
import com.erp.server.modules.system.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/system/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @GetMapping
    public Result<List<ReminderItemDto>> list(
        @RequestParam(required = false) Integer limit,
        @RequestParam(required = false) String moduleKey,
        @RequestParam(required = false) Long recordId
    ) {
        return Result.success(reminderService.listReminders(limit, moduleKey, recordId));
    }
}
