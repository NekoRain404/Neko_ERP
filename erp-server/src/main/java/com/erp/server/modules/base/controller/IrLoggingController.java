package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.IrLoggingDto;
import com.erp.server.modules.base.dto.query.IrLoggingQueryDto;
import com.erp.server.modules.base.service.IrLoggingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/ir-logging")
@RequiredArgsConstructor
public class IrLoggingController {
    private final IrLoggingService service;
    @GetMapping("/list") public Result<PageResult<IrLoggingDto>> list(@ModelAttribute IrLoggingQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/recent") public Result<java.util.List<IrLoggingDto>> recent(@ModelAttribute IrLoggingQueryDto q) { return Result.success(service.listRecent(q)); }
    @GetMapping("/{id}") public Result<IrLoggingDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody IrLoggingDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody IrLoggingDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}
