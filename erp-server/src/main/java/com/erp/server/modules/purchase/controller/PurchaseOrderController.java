package com.erp.server.modules.purchase.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.purchase.dto.PurchaseOrderDto;
import com.erp.server.modules.purchase.dto.query.PurchaseOrderQueryDto;
import com.erp.server.modules.purchase.service.PurchaseOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/purchase/purchase-order")
@RequiredArgsConstructor
public class PurchaseOrderController {
    private final PurchaseOrderService service;
    @GetMapping("/list") public Result<PageResult<PurchaseOrderDto>> list(@ModelAttribute PurchaseOrderQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<PurchaseOrderDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody PurchaseOrderDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody PurchaseOrderDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}