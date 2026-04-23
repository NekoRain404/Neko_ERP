package com.erp.server.modules.stock.service;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.entity.StockInventoryLine;
import com.erp.server.modules.stock.entity.StockQuant;
import com.erp.server.modules.stock.dto.StockInventoryLineDto;
import com.erp.server.modules.stock.dto.query.StockInventoryLineQueryDto;
import com.erp.server.modules.stock.mapper.StockInventoryLineMapper;
import com.erp.server.modules.stock.mapper.StockQuantMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service
@RequiredArgsConstructor
public class StockInventoryLineService extends BaseCrudDtoService<StockInventoryLineMapper, StockInventoryLine, StockInventoryLineDto, StockInventoryLineQueryDto> {
    private final StockQuantMapper quantMapper;

    @Override public Class<StockInventoryLine> getEntityClass() { return StockInventoryLine.class; }
    @Override protected Class<StockInventoryLineDto> getDtoClass() { return StockInventoryLineDto.class; }

    @Override
    protected void beforeSaveDto(StockInventoryLineDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, StockInventoryLineDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(StockInventoryLineDto dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            dto.setName("INV-LINE-AUTO");
        }
        if (dto.getProductQty() == null) {
            dto.setProductQty(BigDecimal.ZERO);
        }
        if (dto.getTheoreticalQty() == null) {
            dto.setTheoreticalQty(resolveTheoreticalQty(dto));
        }
        dto.setDifferenceQty(defaultDecimal(dto.getProductQty()).subtract(defaultDecimal(dto.getTheoreticalQty())));
        dto.setDifferenceState(resolveDifferenceState(dto.getDifferenceQty()));
    }

    private BigDecimal resolveTheoreticalQty(StockInventoryLineDto dto) {
        if (dto.getProductId() == null || dto.getLocationId() == null) {
            return BigDecimal.ZERO;
        }
        return quantMapper.selectList(
            new LambdaQueryWrapper<StockQuant>()
                .eq(StockQuant::getProductId, dto.getProductId())
                .eq(StockQuant::getLocationId, dto.getLocationId())
        ).stream()
            .map(StockQuant::getQuantity)
            .map(this::defaultDecimal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
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
