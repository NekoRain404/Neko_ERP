package com.erp.server.modules.mrp.controller;
import com.erp.server.common.Result;
import com.erp.server.common.PageResult;
import com.erp.server.modules.mrp.dto.MrpBomDto;
import com.erp.server.modules.mrp.dto.query.MrpBomQueryDto;
import com.erp.server.modules.mrp.service.MrpBomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/mrp/mrp-bom")
@RequiredArgsConstructor
public class MrpBomController {
    private final MrpBomService service;
    @GetMapping("/list") public Result<PageResult<MrpBomDto>> list(@ModelAttribute MrpBomQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<MrpBomDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody MrpBomDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody MrpBomDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
    @PostMapping("/{id}/actions/{action}") public Result<Boolean> executeAction(@PathVariable Long id, @PathVariable String action) { return Result.success(service.executeAction(id, action)); }
}