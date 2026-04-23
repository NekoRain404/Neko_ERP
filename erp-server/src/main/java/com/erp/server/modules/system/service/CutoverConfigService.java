package com.erp.server.modules.system.service;

import com.erp.server.modules.system.dto.CutoverConfigDto;
import com.erp.server.modules.system.entity.SysCutoverConfig;
import com.erp.server.modules.system.mapper.SysCutoverConfigMapper;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CutoverConfigService {
    private static final String CURRENT_CONFIG_KEY = "current";

    private final SysCutoverConfigMapper mapper;
    private final CutoverOpsRecordService cutoverOpsRecordService;

    public CutoverConfigDto getCurrentConfig() {
        SysCutoverConfig entity = mapper.selectById(CURRENT_CONFIG_KEY);
        if (entity == null) {
            return null;
        }
        entity.setConfigData(cutoverOpsRecordService.mergeOperationsIntoConfigData(entity.getConfigData()));
        return toDto(entity);
    }

    @Transactional(rollbackFor = Exception.class)
    public CutoverConfigDto saveCurrentConfig(CutoverConfigDto dto) {
        SysCutoverConfig entity = mapper.selectById(CURRENT_CONFIG_KEY);
        if (entity == null) {
            entity = new SysCutoverConfig();
            entity.setConfigKey(CURRENT_CONFIG_KEY);
        }
        Map<String, Object> configData = dto == null || dto.getConfigData() == null ? Collections.emptyMap() : dto.getConfigData();
        // First absorb any role desk / finance review records from the desktop snapshot,
        // then merge the canonical server-side tables back into config_data.
        cutoverOpsRecordService.absorbOperationsSnapshot(configData);
        entity.setConfigData(cutoverOpsRecordService.mergeOperationsIntoConfigData(configData));
        entity.setUpdatedBy(dto == null ? null : dto.getUpdatedBy());
        entity.setUpdatedTime(LocalDateTime.now());

        if (mapper.selectById(CURRENT_CONFIG_KEY) == null) {
            mapper.insert(entity);
        } else {
            mapper.updateById(entity);
        }
        return toDto(entity);
    }

    private CutoverConfigDto toDto(SysCutoverConfig entity) {
        CutoverConfigDto dto = new CutoverConfigDto();
        dto.setConfigKey(entity.getConfigKey());
        dto.setConfigData(entity.getConfigData() == null ? Collections.emptyMap() : entity.getConfigData());
        dto.setUpdatedTime(entity.getUpdatedTime());
        dto.setUpdatedBy(entity.getUpdatedBy());
        return dto;
    }
}
