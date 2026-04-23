package com.erp.server.modules.product.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.product.dto.ProductProductDto;
import com.erp.server.modules.product.dto.query.ProductProductQueryDto;
import com.erp.server.modules.product.service.ProductProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/product/product-product")
@RequiredArgsConstructor
public class ProductProductController {
    private final ProductProductService service;
    @GetMapping("/list") public Result<PageResult<ProductProductDto>> list(@ModelAttribute ProductProductQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ProductProductDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ProductProductDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ProductProductDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}