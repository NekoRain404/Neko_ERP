package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.ResCurrencyDto;
import com.erp.server.modules.base.dto.query.ResCurrencyQueryDto;
import com.erp.server.modules.base.service.ResCurrencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/res-currency")
@RequiredArgsConstructor
public class ResCurrencyController {
    private final ResCurrencyService service;
    @GetMapping("/list") public Result<PageResult<ResCurrencyDto>> list(@ModelAttribute ResCurrencyQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ResCurrencyDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ResCurrencyDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ResCurrencyDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}