package com.erp.server.modules.system.controller;

import com.erp.server.common.Result;
import com.erp.server.modules.system.dto.CutoverConfigDto;
import com.erp.server.modules.system.service.CutoverConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/system/cutover-config")
@RequiredArgsConstructor
public class CutoverConfigController {
    private final CutoverConfigService service;

    @GetMapping("/current")
    public Result<CutoverConfigDto> current() {
        return Result.success(service.getCurrentConfig());
    }

    @PutMapping("/current")
    public Result<CutoverConfigDto> saveCurrent(@RequestBody(required = false) CutoverConfigDto dto) {
        return Result.success(service.saveCurrentConfig(dto));
    }
}
