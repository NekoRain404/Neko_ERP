package com.erp.server.modules.account.controller;

import com.erp.server.common.Result;
import com.erp.server.modules.account.dto.AccountFinancialTraceCockpitDto;
import com.erp.server.modules.account.dto.AccountFinancialTraceDetailDto;
import com.erp.server.modules.account.service.AccountFinancialTraceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/account/financial-trace")
@RequiredArgsConstructor
public class AccountFinancialTraceController {

    private final AccountFinancialTraceService service;

    @GetMapping("/cockpit")
    public Result<AccountFinancialTraceCockpitDto> getCockpit(
        @RequestParam String moduleKey,
        @RequestParam(required = false) Integer limit
    ) {
        return Result.success(service.getCockpit(moduleKey, limit));
    }

    @GetMapping("/detail")
    public Result<AccountFinancialTraceDetailDto> getDetail(
        @RequestParam String moduleKey,
        @RequestParam Long id
    ) {
        return Result.success(service.getDetail(moduleKey, id));
    }
}
