package com.erp.server.modules.system.controller;

import com.erp.server.common.PageResult;
import com.erp.server.common.Result;
import com.erp.server.modules.system.dto.SysScriptDto;
import com.erp.server.modules.system.dto.query.SysScriptQueryDto;
import com.erp.server.modules.system.service.SysScriptService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/system/sys-script")
@RequiredArgsConstructor
public class SysScriptController {
    private final SysScriptService service;

    @GetMapping("/list") public Result<PageResult<SysScriptDto>> list(@ModelAttribute SysScriptQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<SysScriptDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody SysScriptDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody SysScriptDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
}
