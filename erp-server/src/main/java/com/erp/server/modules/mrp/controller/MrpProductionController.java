package com.erp.server.modules.mrp.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.mrp.dto.MrpProductionDto;
import com.erp.server.modules.mrp.dto.query.MrpProductionQueryDto;
import com.erp.server.modules.mrp.service.MrpProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/mrp/mrp-production")
@RequiredArgsConstructor
public class MrpProductionController {
    private final MrpProductionService service;
    @GetMapping("/list") public Result<PageResult<MrpProductionDto>> list(@ModelAttribute MrpProductionQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<MrpProductionDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody MrpProductionDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody MrpProductionDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}