package com.erp.server.modules.product.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.product.dto.ProductPricelistDto;
import com.erp.server.modules.product.dto.query.ProductPricelistQueryDto;
import com.erp.server.modules.product.service.ProductPricelistService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/product/product-pricelist")
@RequiredArgsConstructor
public class ProductPricelistController {
    private final ProductPricelistService service;
    @GetMapping("/list") public Result<PageResult<ProductPricelistDto>> list(@ModelAttribute ProductPricelistQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ProductPricelistDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ProductPricelistDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ProductPricelistDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}