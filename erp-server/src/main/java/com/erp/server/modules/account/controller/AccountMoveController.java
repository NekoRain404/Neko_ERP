package com.erp.server.modules.account.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.account.dto.AccountMoveDto;
import com.erp.server.modules.account.dto.query.AccountMoveQueryDto;
import com.erp.server.modules.account.service.AccountMoveService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/account/account-move")
@RequiredArgsConstructor
public class AccountMoveController {
    private final AccountMoveService service;
    @GetMapping("/list") public Result<PageResult<AccountMoveDto>> list(@ModelAttribute AccountMoveQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<AccountMoveDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody AccountMoveDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody AccountMoveDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}