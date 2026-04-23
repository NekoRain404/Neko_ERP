package com.erp.server.modules.sale.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.sale.dto.SaleOrderDto;
import com.erp.server.modules.sale.dto.query.SaleOrderQueryDto;
import com.erp.server.modules.sale.service.SaleOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/sale/sale-order")
@RequiredArgsConstructor
public class SaleOrderController {
    private final SaleOrderService service;
    @GetMapping("/list") public Result<PageResult<SaleOrderDto>> list(@ModelAttribute SaleOrderQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<SaleOrderDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody SaleOrderDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody SaleOrderDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}