package com.erp.server.modules.stock.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.stock.entity.StockPicking;
import com.erp.server.modules.stock.entity.StockMove;
import com.erp.server.modules.stock.entity.StockQuant;
import com.erp.server.modules.stock.dto.StockPickingDto;
import com.erp.server.modules.stock.dto.query.StockPickingQueryDto;
import com.erp.server.modules.stock.mapper.StockPickingMapper;
import com.erp.server.modules.stock.mapper.StockMoveMapper;
import com.erp.server.modules.stock.mapper.StockQuantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockPickingService extends BaseCrudDtoService<StockPickingMapper, StockPicking, StockPickingDto, StockPickingQueryDto> {

    private final StockMoveMapper moveMapper;
    private final StockQuantMapper quantMapper;

    @Override public Class<StockPicking> getEntityClass() { return StockPicking.class; }
    @Override protected Class<StockPickingDto> getDtoClass() { return StockPickingDto.class; }

    @Override
    protected void beforeSaveDto(StockPickingDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, StockPickingDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(StockPickingDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getScheduledDate() == null) {
            dto.setScheduledDate(LocalDateTime.now());
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean executeAction(Long id, String action) {
        StockPicking picking = getById(id);
        if (picking == null) return false;

        if ("action_confirm".equals(action)) {
            syncMoveState(id, "assigned");
            picking.setState("assigned");
            return updateById(picking);
        }
        if ("action_validate".equals(action)) {
            if ("done".equalsIgnoreCase(picking.getState())) {
                return true;
            }
            picking.setState("done");
            picking.setDateDone(LocalDateTime.now());
            updateById(picking);

            List<StockMove> moves = moveMapper.selectList(
                new LambdaQueryWrapper<StockMove>().eq(StockMove::getPickingId, id)
            );

            for (StockMove move : moves) {
                move.setState("done");
                move.setQuantity(move.getProductUomQty());
                moveMapper.updateById(move);

                BigDecimal movedQty = defaultDecimal(move.getQuantity());
                updateQuant(move.getProductId(), move.getLocationId(), movedQty.negate(), move.getCompanyId());
                updateQuant(move.getProductId(), move.getLocationDestId(), movedQty, move.getCompanyId());
            }
            return true;
        }
        if ("action_cancel".equals(action) || "cancel".equals(action)) {
            if ("done".equalsIgnoreCase(picking.getState())) {
                rollbackDoneQuant(id);
            }
            picking.setState("cancel");
            syncMoveState(id, "cancel");
            return updateById(picking);
        }
        if ("action_draft".equals(action) || "draft".equals(action)) {
            if ("done".equalsIgnoreCase(picking.getState())) {
                rollbackDoneQuant(id);
                resetMoveDoneQuantity(id);
            }
            picking.setState("draft");
            picking.setDateDone(null);
            syncMoveState(id, "draft");
            return updateById(picking);
        }
        return super.executeAction(id, action);
    }

    private void syncMoveState(Long pickingId, String state) {
        List<StockMove> moves = moveMapper.selectList(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getPickingId, pickingId)
        );
        for (StockMove move : moves) {
            move.setState(state);
            moveMapper.updateById(move);
        }
    }

    private void resetMoveDoneQuantity(Long pickingId) {
        List<StockMove> moves = moveMapper.selectList(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getPickingId, pickingId)
        );
        for (StockMove move : moves) {
            move.setQuantity(BigDecimal.ZERO);
            moveMapper.updateById(move);
        }
    }

    private void rollbackDoneQuant(Long pickingId) {
        List<StockMove> moves = moveMapper.selectList(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getPickingId, pickingId)
        );
        for (StockMove move : moves) {
            BigDecimal movedQty = defaultDecimal(move.getQuantity());
            if (BigDecimal.ZERO.compareTo(movedQty) == 0) {
                continue;
            }
            updateQuant(move.getProductId(), move.getLocationDestId(), movedQty.negate(), move.getCompanyId());
            updateQuant(move.getProductId(), move.getLocationId(), movedQty, move.getCompanyId());
        }
    }

    private void updateQuant(Long productId, Long locationId, BigDecimal quantity, Long companyId) {
        if (productId == null || locationId == null || quantity == null) {
            return;
        }
        List<StockQuant> quants = quantMapper.selectList(
            new LambdaQueryWrapper<StockQuant>()
                .eq(StockQuant::getProductId, productId)
                .eq(StockQuant::getLocationId, locationId)
        );
        StockQuant quant = quants.isEmpty() ? null : quants.get(0);

        if (quant == null) {
            quant = new StockQuant();
            quant.setName("Q/" + productId + "/" + locationId);
            quant.setProductId(productId);
            quant.setLocationId(locationId);
            quant.setQuantity(quantity);
            quant.setCompanyId(companyId);
            quantMapper.insert(quant);
        } else {
            quant.setQuantity(defaultDecimal(quant.getQuantity()).add(quantity));
            if (quant.getCompanyId() == null) {
                quant.setCompanyId(companyId);
            }
            quantMapper.updateById(quant);
        }
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
