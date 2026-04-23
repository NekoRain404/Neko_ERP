package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.HrAttendanceDto;
import com.erp.server.modules.base.dto.query.HrAttendanceQueryDto;
import com.erp.server.modules.base.service.HrAttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/hr-attendance")
@RequiredArgsConstructor
public class HrAttendanceController {
    private final HrAttendanceService service;
    @GetMapping("/list") public Result<PageResult<HrAttendanceDto>> list(@ModelAttribute HrAttendanceQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<HrAttendanceDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody HrAttendanceDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody HrAttendanceDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}