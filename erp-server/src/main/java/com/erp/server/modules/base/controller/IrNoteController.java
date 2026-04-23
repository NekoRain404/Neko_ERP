package com.erp.server.modules.base.controller;

import com.erp.server.common.PageResult;
import com.erp.server.common.Result;
import com.erp.server.modules.base.dto.IrNoteDto;
import com.erp.server.modules.base.dto.query.IrNoteQueryDto;
import com.erp.server.modules.base.service.IrNoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/base/ir-note")
@RequiredArgsConstructor
public class IrNoteController {
    private final IrNoteService service;

    @GetMapping("/list") public Result<PageResult<IrNoteDto>> list(@ModelAttribute IrNoteQueryDto q) { return Result.success(service.pageDto(q)); }
    @GetMapping("/{id}") public Result<IrNoteDto> get(@PathVariable Long id) { return Result.success(service.getDtoById(id)); }
    @PostMapping public Result<Boolean> save(@RequestBody IrNoteDto d) { return Result.success(service.saveDto(d)); }
    @PutMapping("/{id}") public Result<Boolean> update(@PathVariable Long id, @RequestBody IrNoteDto d) { return Result.success(service.updateDto(id, d)); }
    @DeleteMapping("/{id}") public Result<Boolean> delete(@PathVariable Long id) { return Result.success(service.removeById(id)); }
}
