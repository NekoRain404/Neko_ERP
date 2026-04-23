package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.CrmStageDto;
import com.erp.server.modules.base.dto.query.CrmStageQueryDto;
import com.erp.server.modules.base.service.CrmStageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/crm-stage")
@RequiredArgsConstructor
public class CrmStageController {
    private final CrmStageService service;
    @GetMapping("/list") public Result<PageResult<CrmStageDto>> list(@ModelAttribute CrmStageQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<CrmStageDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody CrmStageDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody CrmStageDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}