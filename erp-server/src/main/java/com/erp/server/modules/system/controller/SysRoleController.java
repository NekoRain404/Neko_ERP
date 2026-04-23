package com.erp.server.modules.system.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.system.dto.SysRoleDto;
import com.erp.server.modules.system.dto.query.SysRoleQueryDto;
import com.erp.server.modules.system.service.SysRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/system/sys-role")
@RequiredArgsConstructor
public class SysRoleController {
    private final SysRoleService service;
    @GetMapping("/list") public Result<PageResult<SysRoleDto>> list(@ModelAttribute SysRoleQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<SysRoleDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody SysRoleDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody SysRoleDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}