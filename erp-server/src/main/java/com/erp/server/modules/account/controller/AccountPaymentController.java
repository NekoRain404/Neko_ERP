package com.erp.server.modules.account.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.account.dto.AccountPaymentDto;
import com.erp.server.modules.account.dto.query.AccountPaymentQueryDto;
import com.erp.server.modules.account.service.AccountPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/account/account-payment")
@RequiredArgsConstructor
public class AccountPaymentController {
    private final AccountPaymentService service;
    @GetMapping("/list") public Result<PageResult<AccountPaymentDto>> list(@ModelAttribute AccountPaymentQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<AccountPaymentDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody AccountPaymentDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody AccountPaymentDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}