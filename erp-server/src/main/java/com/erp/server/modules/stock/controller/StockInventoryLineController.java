package com.erp.server.modules.stock.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.stock.dto.StockInventoryLineDto;
import com.erp.server.modules.stock.dto.query.StockInventoryLineQueryDto;
import com.erp.server.modules.stock.service.StockInventoryLineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/stock/stock-inventory-line")
@RequiredArgsConstructor
public class StockInventoryLineController {
    private final StockInventoryLineService service;
    @GetMapping("/list") public Result<PageResult<StockInventoryLineDto>> list(@ModelAttribute StockInventoryLineQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<StockInventoryLineDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody StockInventoryLineDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody StockInventoryLineDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}