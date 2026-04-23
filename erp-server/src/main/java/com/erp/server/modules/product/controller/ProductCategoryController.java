package com.erp.server.modules.product.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.product.dto.ProductCategoryDto;
import com.erp.server.modules.product.dto.query.ProductCategoryQueryDto;
import com.erp.server.modules.product.service.ProductCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/product/product-category")
@RequiredArgsConstructor
public class ProductCategoryController {
    private final ProductCategoryService service;
    @GetMapping("/list") public Result<PageResult<ProductCategoryDto>> list(@ModelAttribute ProductCategoryQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ProductCategoryDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ProductCategoryDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ProductCategoryDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}