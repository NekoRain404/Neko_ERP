package com.erp.server.modules.stock.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.dto.StockInventoryDto;
import com.erp.server.modules.stock.dto.query.StockInventoryQueryDto;
import com.erp.server.modules.stock.entity.StockInventory;
import com.erp.server.modules.stock.entity.StockInventoryLine;
import com.erp.server.modules.stock.entity.StockQuant;
import com.erp.server.modules.stock.mapper.StockInventoryLineMapper;
import com.erp.server.modules.stock.mapper.StockInventoryMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockInventoryService extends BaseCrudDtoService<StockInventoryMapper, StockInventory, StockInventoryDto, StockInventoryQueryDto> {
    private final StockInventoryLineMapper lineMapper;
    private final com.erp.server.modules.stock.mapper.StockQuantMapper quantMapper;

    @Override public Class<StockInventory> getEntityClass() { return StockInventory.class; }
    @Override protected Class<StockInventoryDto> getDtoClass() { return StockInventoryDto.class; }

    @Override
    protected void beforeSaveDto(StockInventoryDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, StockInventoryDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(StockInventoryDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getDate() == null) {
            dto.setDate(LocalDateTime.now());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean executeAction(Long id, String action) {
        StockInventory inventory = getById(id);
        if (inventory == null) {
            return false;
        }
        if ("action_start".equals(action)) {
            refreshInventoryLines(inventory.getId(), true);
            inventory.setState("confirm");
            return updateById(inventory);
        }
        if ("action_validate".equals(action)) {
            applyInventoryLinesToQuants(inventory.getId(), inventory.getCompanyId());
            markInventoryLinesApplied(inventory.getId());
            inventory.setState("done");
            return updateById(inventory);
        }
        if ("action_cancel".equals(action)) {
            inventory.setState("cancel");
            return updateById(inventory);
        }
        if ("action_draft".equals(action)) {
            rollbackInventoryLinesToTheoretical(inventory.getId(), inventory.getCompanyId());
            refreshInventoryLines(inventory.getId(), true);
            inventory.setState("draft");
            return updateById(inventory);
        }
        return super.executeAction(id, action);
    }

    private void applyInventoryLinesToQuants(Long inventoryId, Long companyId) {
        for (StockInventoryLine line : lineMapper.selectList(
            new LambdaQueryWrapper<StockInventoryLine>().eq(StockInventoryLine::getInventoryId, inventoryId)
        )) {
            upsertQuant(line.getProductId(), line.getLocationId(), line.getProductQty(), companyId);
        }
    }

    private void rollbackInventoryLinesToTheoretical(Long inventoryId, Long companyId) {
        for (StockInventoryLine line : lineMapper.selectList(
            new LambdaQueryWrapper<StockInventoryLine>().eq(StockInventoryLine::getInventoryId, inventoryId)
        )) {
            upsertQuant(line.getProductId(), line.getLocationId(), line.getTheoreticalQty(), companyId);
        }
    }

    private void refreshInventoryLines(Long inventoryId, boolean refreshTheoretical) {
        List<StockInventoryLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<StockInventoryLine>().eq(StockInventoryLine::getInventoryId, inventoryId)
        );
        for (StockInventoryLine line : lines) {
            if (refreshTheoretical) {
                line.setTheoreticalQty(resolveCurrentQuant(line.getProductId(), line.getLocationId()));
            }
            BigDecimal difference = defaultDecimal(line.getProductQty()).subtract(defaultDecimal(line.getTheoreticalQty()));
            line.setDifferenceQty(difference);
            line.setDifferenceState(resolveDifferenceState(difference));
            lineMapper.updateById(line);
        }
    }

    private void markInventoryLinesApplied(Long inventoryId) {
        List<StockInventoryLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<StockInventoryLine>().eq(StockInventoryLine::getInventoryId, inventoryId)
        );
        for (StockInventoryLine line : lines) {
            line.setDifferenceQty(BigDecimal.ZERO);
            line.setDifferenceState("match");
            lineMapper.updateById(line);
        }
    }

    private BigDecimal resolveCurrentQuant(Long productId, Long locationId) {
        if (productId == null || locationId == null) {
            return BigDecimal.ZERO;
        }
        return quantMapper.selectList(
            new LambdaQueryWrapper<StockQuant>()
                .eq(StockQuant::getProductId, productId)
                .eq(StockQuant::getLocationId, locationId)
        ).stream()
            .map(StockQuant::getQuantity)
            .map(this::defaultDecimal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void upsertQuant(Long productId, Long locationId, BigDecimal quantity, Long companyId) {
        if (productId == null || locationId == null) {
            return;
        }
        BigDecimal finalQty = quantity == null ? BigDecimal.ZERO : quantity;
        StockQuant quant = quantMapper.selectOne(
            new LambdaQueryWrapper<StockQuant>()
                .eq(StockQuant::getProductId, productId)
                .eq(StockQuant::getLocationId, locationId)
                .last("LIMIT 1")
        );
        if (quant == null) {
            quant = new StockQuant();
            quant.setName("Q/" + productId + "/" + locationId);
            quant.setProductId(productId);
            quant.setLocationId(locationId);
            quant.setQuantity(finalQty);
            quant.setCompanyId(companyId == null ? 1L : companyId);
            quantMapper.insert(quant);
            return;
        }
        quant.setQuantity(finalQty);
        if (quant.getCompanyId() == null && companyId != null) {
            quant.setCompanyId(companyId);
        }
        quantMapper.updateById(quant);
    }

    private String resolveDifferenceState(BigDecimal differenceQty) {
        BigDecimal value = defaultDecimal(differenceQty);
        if (value.compareTo(BigDecimal.ZERO) > 0) {
            return "gain";
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            return "loss";
        }
        return "match";
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
