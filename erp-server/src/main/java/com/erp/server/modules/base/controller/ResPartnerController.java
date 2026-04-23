package com.erp.server.modules.base.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.base.dto.ResPartnerDto;
import com.erp.server.modules.base.dto.query.ResPartnerQueryDto;
import com.erp.server.modules.base.service.ResPartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/base/res-partner")
@RequiredArgsConstructor
public class ResPartnerController {
    private final ResPartnerService service;
    @GetMapping("/list") public Result<PageResult<ResPartnerDto>> list(@ModelAttribute ResPartnerQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ResPartnerDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ResPartnerDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ResPartnerDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}