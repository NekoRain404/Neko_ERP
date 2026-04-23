package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.ResCompanyDto;
import com.erp.server.modules.base.dto.query.ResCompanyQueryDto;
import com.erp.server.modules.base.service.ResCompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/res-company")
@RequiredArgsConstructor
public class ResCompanyController {
    private final ResCompanyService service;
    @GetMapping("/list") public Result<PageResult<ResCompanyDto>> list(@ModelAttribute ResCompanyQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ResCompanyDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ResCompanyDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ResCompanyDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}