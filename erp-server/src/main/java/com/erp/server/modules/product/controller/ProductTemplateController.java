package com.erp.server.modules.product.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.product.dto.ProductTemplateDto;
import com.erp.server.modules.product.dto.query.ProductTemplateQueryDto;
import com.erp.server.modules.product.service.ProductTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/product/product-template")
@RequiredArgsConstructor
public class ProductTemplateController {
    private final ProductTemplateService service;
    @GetMapping("/list") public Result<PageResult<ProductTemplateDto>> list(@ModelAttribute ProductTemplateQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<ProductTemplateDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody ProductTemplateDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody ProductTemplateDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}