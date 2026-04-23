package com.erp.server.modules.account.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.account.dto.AccountAccountDto;
import com.erp.server.modules.account.dto.query.AccountAccountQueryDto;
import com.erp.server.modules.account.service.AccountAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/account/account-account")
@RequiredArgsConstructor
public class AccountAccountController {
    private final AccountAccountService service;
    @GetMapping("/list") public Result<PageResult<AccountAccountDto>> list(@ModelAttribute AccountAccountQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<AccountAccountDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody AccountAccountDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody AccountAccountDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}