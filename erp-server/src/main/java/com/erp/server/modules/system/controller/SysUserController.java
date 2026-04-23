package com.erp.server.modules.system.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.system.dto.SysUserDto;
import com.erp.server.modules.system.dto.query.SysUserQueryDto;
import com.erp.server.modules.system.service.SysUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/system/sys-user")
@RequiredArgsConstructor
public class SysUserController {
    private final SysUserService service;
    @GetMapping("/list") public Result<PageResult<SysUserDto>> list(@ModelAttribute SysUserQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<SysUserDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody SysUserDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody SysUserDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}