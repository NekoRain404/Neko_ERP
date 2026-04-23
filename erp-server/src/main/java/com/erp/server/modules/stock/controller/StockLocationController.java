package com.erp.server.modules.stock.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.stock.dto.StockLocationDto;
import com.erp.server.modules.stock.dto.query.StockLocationQueryDto;
import com.erp.server.modules.stock.service.StockLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/stock/stock-location")
@RequiredArgsConstructor
public class StockLocationController {
    private final StockLocationService service;
    @GetMapping("/list") public Result<PageResult<StockLocationDto>> list(@ModelAttribute StockLocationQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<StockLocationDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody StockLocationDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody StockLocationDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}