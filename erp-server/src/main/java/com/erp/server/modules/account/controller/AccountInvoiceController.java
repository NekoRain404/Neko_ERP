package com.erp.server.modules.account.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.account.dto.AccountInvoiceDto;
import com.erp.server.modules.account.dto.query.AccountInvoiceQueryDto;
import com.erp.server.modules.account.service.AccountInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/account/account-invoice")
@RequiredArgsConstructor
public class AccountInvoiceController {
    private final AccountInvoiceService service;
    @GetMapping("/list") public Result<PageResult<AccountInvoiceDto>> list(@ModelAttribute AccountInvoiceQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<AccountInvoiceDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody AccountInvoiceDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody AccountInvoiceDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}
