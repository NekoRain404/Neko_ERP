package com.erp.server.modules.mrp.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.mrp.dto.MrpProductionDto;
import com.erp.server.modules.mrp.dto.query.MrpProductionQueryDto;
import com.erp.server.modules.mrp.entity.MrpBom;
import com.erp.server.modules.mrp.entity.MrpBomLine;
import com.erp.server.modules.mrp.entity.MrpProduction;
import com.erp.server.modules.mrp.mapper.MrpBomLineMapper;
import com.erp.server.modules.mrp.mapper.MrpBomMapper;
import com.erp.server.modules.mrp.mapper.MrpProductionMapper;
import com.erp.server.modules.stock.entity.StockMove;
import com.erp.server.modules.stock.entity.StockQuant;
import com.erp.server.modules.stock.mapper.StockMoveMapper;
import com.erp.server.modules.stock.mapper.StockQuantMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MrpProductionService extends BaseCrudDtoService<MrpProductionMapper, MrpProduction, MrpProductionDto, MrpProductionQueryDto> {
    private static final long DEFAULT_FINISHED_LOCATION_ID = 1L;
    private static final long DEFAULT_COMPONENT_SOURCE_LOCATION_ID = 1L;
    private static final long DEFAULT_PRODUCTION_LOCATION_ID = 2L;

    private final MrpBomMapper bomMapper;
    private final MrpBomLineMapper bomLineMapper;
    private final StockMoveMapper moveMapper;
    private final StockQuantMapper quantMapper;

    @Override public Class<MrpProduction> getEntityClass() { return MrpProduction.class; }
    @Override protected Class<MrpProductionDto> getDtoClass() { return MrpProductionDto.class; }

    @Override
    protected void beforeSaveDto(MrpProductionDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, MrpProductionDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(MrpProductionDto dto) {
        syncFromBom(dto);
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getProductQty() == null) {
            dto.setProductQty(BigDecimal.ONE);
        }
        if (dto.getQtyProduced() == null) {
            dto.setQtyProduced(defaultDecimal(dto.getProductQty()));
        }
        if (dto.getFinishedLocationId() == null) {
            dto.setFinishedLocationId(DEFAULT_FINISHED_LOCATION_ID);
        }
        if (dto.getComponentCost() == null) {
            dto.setComponentCost(BigDecimal.ZERO);
        }
        if (dto.getFinishedCost() == null) {
            dto.setFinishedCost(BigDecimal.ZERO);
        }
        if (dto.getName() == null || dto.getName().isBlank()) {
            dto.setName("MO-AUTO");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean executeAction(Long id, String action) {
        MrpProduction production = getById(id);
        if (production == null) {
            return false;
        }

        if ("action_confirm".equals(action)) {
            syncEntityFromBom(production);
            syncProductionMoves(production, "assigned");
            if ("confirmed".equals(production.getState())) {
                return true;
            }
            production.setState("confirmed");
            return updateById(production);
        }
        if ("action_done".equals(action) || "button_mark_done".equals(action)) {
            syncEntityFromBom(production);
            syncProductionMoves(production, "done");
            if ("done".equals(production.getState())) {
                return true;
            }
            production.setState("done");
            boolean updated = updateById(production);
            if (updated) {
                applyProductionMoveQuants(production, false);
            }
            return updated;
        }
        if ("action_cancel".equals(action)) {
            if ("done".equals(production.getState())) {
                applyProductionMoveQuants(production, true);
            }
            syncProductionMoves(production, "cancel");
            production.setState("cancel");
            return updateById(production);
        }
        if ("action_draft".equals(action)) {
            if ("done".equals(production.getState())) {
                applyProductionMoveQuants(production, true);
            }
            syncProductionMoves(production, "draft");
            production.setState("draft");
            return updateById(production);
        }
        return super.executeAction(id, action);
    }

    private void syncFromBom(MrpProductionDto dto) {
        if (dto.getBomId() == null) {
            return;
        }
        MrpBom bom = bomMapper.selectById(dto.getBomId());
        if (bom == null) {
            return;
        }
        if (dto.getProductId() == null) {
            dto.setProductId(bom.getProductId());
        }
        if (dto.getProductQty() == null) {
            dto.setProductQty(defaultDecimal(bom.getProductQty()));
        }
        if (dto.getQtyProduced() == null) {
            dto.setQtyProduced(defaultDecimal(dto.getProductQty()));
        }
        if (dto.getOriginRef() == null || dto.getOriginRef().isBlank()) {
            dto.setOriginRef(bom.getName());
        }
        if (dto.getCompanyId() == null) {
            dto.setCompanyId(bom.getCompanyId());
        }
    }

    private void syncEntityFromBom(MrpProduction production) {
        if (production.getBomId() == null) {
            return;
        }
        MrpBom bom = bomMapper.selectById(production.getBomId());
        if (bom == null) {
            return;
        }
        if (production.getProductId() == null) {
            production.setProductId(bom.getProductId());
        }
        if (production.getProductQty() == null) {
            production.setProductQty(defaultDecimal(bom.getProductQty()));
        }
        if (production.getQtyProduced() == null) {
            production.setQtyProduced(defaultDecimal(production.getProductQty()));
        }
        if (production.getFinishedLocationId() == null) {
            production.setFinishedLocationId(DEFAULT_FINISHED_LOCATION_ID);
        }
        if (production.getOriginRef() == null || production.getOriginRef().isBlank()) {
            production.setOriginRef(bom.getName());
        }
        if (production.getCompanyId() == null) {
            production.setCompanyId(bom.getCompanyId());
        }
        if (production.getComponentCost() == null) {
            production.setComponentCost(BigDecimal.ZERO);
        }
        if (production.getFinishedCost() == null) {
            production.setFinishedCost(BigDecimal.ZERO);
        }
    }

    private void syncProductionMoves(MrpProduction production, String targetState) {
        if (production.getId() == null) {
            return;
        }
        syncEntityFromBom(production);
        MrpBom bom = production.getBomId() == null ? null : bomMapper.selectById(production.getBomId());
        BigDecimal bomQty = bom == null ? BigDecimal.ONE : defaultDecimal(bom.getProductQty());
        BigDecimal factor = bomQty.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ONE
            : defaultDecimal(production.getProductQty()).divide(bomQty, 6, RoundingMode.HALF_UP);
        List<MrpBomLine> bomLines = production.getBomId() == null
            ? List.of()
            : bomLineMapper.selectList(new LambdaQueryWrapper<MrpBomLine>().eq(MrpBomLine::getBomId, production.getBomId()));
        List<StockMove> existingMoves = moveMapper.selectList(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getProductionId, production.getId())
        );
        Set<String> activeMoveNames = new HashSet<>();
        BigDecimal computedComponentCost = BigDecimal.ZERO;

        for (MrpBomLine line : bomLines) {
            String moveName = "MO-COMP/" + production.getName() + "/" + line.getId();
            activeMoveNames.add(moveName);
            StockMove move = findOrCreateMove(existingMoves, moveName);
            move.setName(moveName);
            move.setProductionId(production.getId());
            move.setProductId(line.getProductId());
            move.setProductUomQty(defaultDecimal(line.getProductQty()).multiply(factor).setScale(2, RoundingMode.HALF_UP));
            move.setQuantity("done".equals(targetState) ? move.getProductUomQty() : BigDecimal.ZERO);
            move.setLocationId(DEFAULT_COMPONENT_SOURCE_LOCATION_ID);
            move.setLocationDestId(DEFAULT_PRODUCTION_LOCATION_ID);
            move.setOriginRef(production.getName());
            move.setSourceLineRef(line.getName());
            move.setMoveRole("component");
            move.setUnitCost(BigDecimal.ONE.setScale(2, RoundingMode.HALF_UP));
            move.setTotalCost(move.getProductUomQty().multiply(defaultDecimal(move.getUnitCost())).setScale(2, RoundingMode.HALF_UP));
            computedComponentCost = computedComponentCost.add(defaultDecimal(move.getTotalCost()));
            move.setCompanyId(production.getCompanyId());
            move.setState(targetState);
            persistMove(move);
        }

        if (production.getProductId() != null) {
            String finishedName = "MO-FG/" + production.getName();
            activeMoveNames.add(finishedName);
            StockMove finishedMove = findOrCreateMove(existingMoves, finishedName);
            finishedMove.setName(finishedName);
            finishedMove.setProductionId(production.getId());
            finishedMove.setProductId(production.getProductId());
            finishedMove.setProductUomQty(defaultDecimal(production.getQtyProduced()));
            finishedMove.setQuantity("done".equals(targetState) ? defaultDecimal(production.getQtyProduced()) : BigDecimal.ZERO);
            finishedMove.setLocationId(DEFAULT_PRODUCTION_LOCATION_ID);
            finishedMove.setLocationDestId(production.getFinishedLocationId());
            finishedMove.setOriginRef(production.getName());
            finishedMove.setSourceLineRef(production.getOriginRef());
            finishedMove.setMoveRole("finished");
            BigDecimal finishedQty = defaultDecimal(production.getQtyProduced());
            BigDecimal componentCost = computedComponentCost.setScale(2, RoundingMode.HALF_UP);
            BigDecimal unitCost = finishedQty.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : componentCost.divide(finishedQty, 2, RoundingMode.HALF_UP);
            finishedMove.setUnitCost(unitCost);
            finishedMove.setTotalCost(componentCost.setScale(2, RoundingMode.HALF_UP));
            finishedMove.setCompanyId(production.getCompanyId());
            finishedMove.setState(targetState);
            persistMove(finishedMove);
        }

        for (StockMove move : existingMoves) {
            if (!activeMoveNames.contains(move.getName())) {
                moveMapper.deleteById(move.getId());
            }
        }
        syncProductionCosts(production);
    }

    private StockMove findOrCreateMove(List<StockMove> existingMoves, String name) {
        return existingMoves.stream()
            .filter(move -> name.equals(move.getName()))
            .findFirst()
            .orElseGet(StockMove::new);
    }

    private void persistMove(StockMove move) {
        if (move.getId() == null) {
            moveMapper.insert(move);
        } else {
            moveMapper.updateById(move);
        }
    }

    private void syncProductionCosts(MrpProduction production) {
        List<StockMove> moves = moveMapper.selectList(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getProductionId, production.getId())
        );
        BigDecimal componentCost = BigDecimal.ZERO;
        BigDecimal finishedCost = BigDecimal.ZERO;
        for (StockMove move : moves) {
            if ("component".equals(move.getMoveRole()) || (move.getName() != null && move.getName().startsWith("MO-COMP/"))) {
                componentCost = componentCost.add(defaultDecimal(move.getTotalCost()));
            }
            if ("finished".equals(move.getMoveRole()) || (move.getName() != null && move.getName().startsWith("MO-FG/"))) {
                finishedCost = finishedCost.add(defaultDecimal(move.getTotalCost()));
            }
        }
        production.setComponentCost(componentCost.setScale(2, RoundingMode.HALF_UP));
        production.setFinishedCost(finishedCost.setScale(2, RoundingMode.HALF_UP));
        updateById(production);
    }

    private void applyProductionMoveQuants(MrpProduction production, boolean rollback) {
        List<StockMove> moves = moveMapper.selectList(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getProductionId, production.getId())
        );
        for (StockMove move : moves) {
            BigDecimal quantity = defaultDecimal(move.getQuantity());
            if (quantity.compareTo(BigDecimal.ZERO) == 0) {
                quantity = defaultDecimal(move.getProductUomQty());
            }
            if (quantity.compareTo(BigDecimal.ZERO) == 0 || move.getProductId() == null) {
                continue;
            }
            BigDecimal factor = rollback ? BigDecimal.ONE.negate() : BigDecimal.ONE;
            transferQuant(
                move.getProductId(),
                move.getLocationId(),
                move.getLocationDestId(),
                quantity.multiply(factor),
                move.getCompanyId() == null ? production.getCompanyId() : move.getCompanyId()
            );
        }
    }

    private void transferQuant(Long productId, Long sourceLocationId, Long destLocationId, BigDecimal quantity, Long companyId) {
        if (productId == null || quantity == null || quantity.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        if (sourceLocationId != null) {
            adjustQuant(productId, sourceLocationId, quantity.negate(), companyId);
        }
        if (destLocationId != null) {
            adjustQuant(productId, destLocationId, quantity, companyId);
        }
    }

    private void adjustQuant(Long productId, Long locationId, BigDecimal delta, Long companyId) {
        if (productId == null || locationId == null || delta == null || delta.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        List<StockQuant> quants = quantMapper.selectList(
            new LambdaQueryWrapper<StockQuant>()
                .eq(StockQuant::getProductId, productId)
                .eq(StockQuant::getLocationId, locationId)
                .orderByAsc(StockQuant::getId)
        );
        if (quants.isEmpty()) {
            StockQuant quant = new StockQuant();
            quant.setName("Q/" + productId + "/" + locationId);
            quant.setProductId(productId);
            quant.setLocationId(locationId);
            quant.setQuantity(defaultDecimal(delta).max(BigDecimal.ZERO));
            quant.setCompanyId(companyId == null ? 1L : companyId);
            quantMapper.insert(quant);
            return;
        }

        // Repeated smoke runs or manual imports can leave duplicate quant rows
        // under the same product/location pair. Consolidating them here keeps
        // MRP transfers and rollback math stable instead of drifting forever.
        StockQuant primary = quants.get(0);
        BigDecimal current = quants.stream()
            .map(StockQuant::getQuantity)
            .map(this::defaultDecimal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal next = current.add(delta);
        if (next.compareTo(BigDecimal.ZERO) < 0) {
            next = BigDecimal.ZERO;
        }
        primary.setQuantity(next);
        if (primary.getCompanyId() == null && companyId != null) {
            primary.setCompanyId(companyId);
        }
        quantMapper.updateById(primary);

        for (int index = 1; index < quants.size(); index++) {
            quantMapper.deleteById(quants.get(index).getId());
        }
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
