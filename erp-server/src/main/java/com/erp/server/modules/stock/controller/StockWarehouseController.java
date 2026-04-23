package com.erp.server.modules.stock.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.stock.dto.StockWarehouseDto;
import com.erp.server.modules.stock.dto.query.StockWarehouseQueryDto;
import com.erp.server.modules.stock.service.StockWarehouseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/stock/stock-warehouse")
@RequiredArgsConstructor
public class StockWarehouseController {
    private final StockWarehouseService service;
    @GetMapping("/list") public Result<PageResult<StockWarehouseDto>> list(@ModelAttribute StockWarehouseQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<StockWarehouseDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody StockWarehouseDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody StockWarehouseDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}