package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.IrAttachmentDto;
import com.erp.server.modules.base.dto.query.IrAttachmentQueryDto;
import com.erp.server.modules.base.service.IrAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/ir-attachment")
@RequiredArgsConstructor
public class IrAttachmentController {
    private final IrAttachmentService service;
    @GetMapping("/list") public Result<PageResult<IrAttachmentDto>> list(@ModelAttribute IrAttachmentQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<IrAttachmentDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody IrAttachmentDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody IrAttachmentDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}