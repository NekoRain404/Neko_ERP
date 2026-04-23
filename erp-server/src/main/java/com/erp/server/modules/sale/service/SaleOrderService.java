package com.erp.server.modules.sale.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.entity.AccountInvoice;
import com.erp.server.modules.account.service.AccountInvoiceService;
import com.erp.server.modules.sale.entity.SaleOrder;
import com.erp.server.modules.sale.entity.SaleOrderLine;
import com.erp.server.modules.sale.dto.SaleOrderDto;
import com.erp.server.modules.sale.dto.query.SaleOrderQueryDto;
import com.erp.server.modules.sale.mapper.SaleOrderMapper;
import com.erp.server.modules.sale.mapper.SaleOrderLineMapper;
import com.erp.server.modules.account.mapper.AccountInvoiceMapper;
import com.erp.server.modules.stock.entity.StockMove;
import com.erp.server.modules.stock.entity.StockPicking;
import com.erp.server.modules.stock.entity.StockLocation;
import com.erp.server.modules.stock.mapper.StockLocationMapper;
import com.erp.server.modules.stock.service.StockMoveService;
import com.erp.server.modules.stock.service.StockPickingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SaleOrderService extends BaseCrudDtoService<SaleOrderMapper, SaleOrder, SaleOrderDto, SaleOrderQueryDto> {

    private final SaleOrderLineMapper lineMapper;
    private final StockPickingService pickingService;
    private final StockMoveService moveService;
    private final StockLocationMapper stockLocationMapper;
    private final AccountInvoiceMapper accountInvoiceMapper;
    private final AccountInvoiceService accountInvoiceService;

    @Override public Class<SaleOrder> getEntityClass() { return SaleOrder.class; }
    @Override protected Class<SaleOrderDto> getDtoClass() { return SaleOrderDto.class; }

    @Override
    protected void beforeSaveDto(SaleOrderDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, SaleOrderDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(SaleOrderDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getDateOrder() == null) {
            dto.setDateOrder(LocalDateTime.now());
        }
        BigDecimal untaxed = defaultDecimal(dto.getAmountUntaxed());
        BigDecimal tax = defaultDecimal(dto.getAmountTax());
        dto.setAmountUntaxed(untaxed);
        dto.setAmountTax(tax);
        dto.setAmountTotal(untaxed.add(tax));
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean executeAction(Long id, String action) {
        SaleOrder order = getById(id);
        if (order == null) return false;

        if ("action_confirm".equals(action)) {
            order.setState("sale");
            StockPicking picking = ensurePickingArtifact(order);
            order.setPickingRef(picking.getName());
            updateById(order);
            syncPickingMoves(order, picking);
            syncOrderLines(id, "sale");
            return true;
        } else if ("action_cancel".equals(action) || "cancel".equals(action)) {
            order.setState("cancel");
            boolean updated = updateById(order);
            if (updated) {
                syncOrderLines(id, "cancel");
                syncPickingArtifact(order, "cancel", false);
                syncInvoiceArtifact(order, "cancel", false);
            }
            return updated;
        } else if ("action_draft".equals(action) || "draft".equals(action)) {
            order.setState("draft");
            order.setPickingRef(null);
            order.setInvoiceRef(null);
            boolean updated = lambdaUpdate()
                .eq(SaleOrder::getId, order.getId())
                .set(SaleOrder::getState, "draft")
                .setSql("picking_ref = NULL, invoice_ref = NULL")
                .update();
            if (updated) {
                syncOrderLines(id, "draft");
                syncPickingArtifact(order, "draft", true);
                syncInvoiceArtifact(order, "draft", true);
            }
            return updated;
        } else if ("action_create_invoice".equals(action)) {
            String invoiceName = "INV/" + order.getName();
            AccountInvoice existing = accountInvoiceMapper.selectOne(
                new LambdaQueryWrapper<AccountInvoice>().eq(AccountInvoice::getName, invoiceName)
            );
            if (existing != null) {
                syncInvoiceArtifactFields(order, existing);
                if (order.getInvoiceRef() == null || order.getInvoiceRef().isBlank()) {
                    order.setInvoiceRef(existing.getName());
                    updateById(order);
                }
                return true;
            }

            AccountInvoice invoice = new AccountInvoice();
            invoice.setName(invoiceName);
            invoice.setPartnerId(order.getPartnerId());
            invoice.setInvoiceDate(LocalDate.now());
            invoice.setDueDate(LocalDate.now());
            invoice.setState("draft");
            invoice.setCompanyId(order.getCompanyId());
            invoice.setAmountUntaxed(defaultDecimal(order.getAmountUntaxed()));
            invoice.setAmountTax(defaultDecimal(order.getAmountTax()));
            invoice.setAmountTotal(defaultDecimal(order.getAmountTotal()));
            invoice.setOriginRef(order.getName());
            invoice.setPaymentState("not_paid");
            accountInvoiceMapper.insert(invoice);
            order.setInvoiceRef(invoice.getName());
            updateById(order);
            return true;
        }
        return super.executeAction(id, action);
    }

    private void syncPickingArtifact(SaleOrder order, String action, boolean clearRef) {
        if (order.getName() == null || order.getName().isBlank()) {
            return;
        }
        StockPicking picking = pickingService.getOne(
            new LambdaQueryWrapper<StockPicking>().eq(StockPicking::getOrigin, order.getName()).last("LIMIT 1")
        );
        if (picking == null) {
            return;
        }
        pickingService.executeAction(picking.getId(), action);
        if (clearRef) {
            lambdaUpdate()
                .eq(SaleOrder::getId, order.getId())
                .setSql("picking_ref = NULL")
                .update();
        }
    }

    private void syncOrderLines(Long orderId, String state) {
        List<SaleOrderLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<SaleOrderLine>().eq(SaleOrderLine::getOrderId, orderId)
        );
        for (SaleOrderLine line : lines) {
            line.setState(state);
            lineMapper.updateById(line);
        }
    }

    private StockPicking ensurePickingArtifact(SaleOrder order) {
        StockPicking picking = pickingService.getOne(
            new LambdaQueryWrapper<StockPicking>().eq(StockPicking::getOrigin, order.getName()).last("LIMIT 1")
        );
        Long sourceLocationId = ensureDefaultLocationId("internal", "WH/Stock", order.getCompanyId());
        Long destLocationId = ensureDefaultLocationId("customer", "Customers", order.getCompanyId());
        if (picking == null) {
            picking = new StockPicking();
            picking.setName("WH/OUT/" + order.getName());
            picking.setOrigin(order.getName());
            picking.setScheduledDate(LocalDateTime.now());
        }
        picking.setPartnerId(order.getPartnerId());
        picking.setState("assigned");
        if (picking.getScheduledDate() == null) {
            picking.setScheduledDate(LocalDateTime.now());
        }
        picking.setLocationId(sourceLocationId);
        picking.setLocationDestId(destLocationId);
        picking.setCompanyId(order.getCompanyId());
        if (picking.getId() == null) {
            pickingService.save(picking);
        } else {
            pickingService.updateById(picking);
        }
        return picking;
    }

    private void syncPickingMoves(SaleOrder order, StockPicking picking) {
        List<SaleOrderLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<SaleOrderLine>().eq(SaleOrderLine::getOrderId, order.getId())
        );
        List<StockMove> existingMoves = moveService.list(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getPickingId, picking.getId())
        );
        Set<String> activeLineRefs = lines.stream()
            .map(SaleOrderLine::getName)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        for (SaleOrderLine line : lines) {
            StockMove move = existingMoves.stream()
                .filter(candidate -> Objects.equals(candidate.getSourceLineRef(), line.getName()) || Objects.equals(candidate.getName(), line.getName()))
                .findFirst()
                .orElseGet(StockMove::new);
            move.setName(line.getName());
            move.setPickingId(picking.getId());
            move.setProductId(line.getProductId());
            move.setProductUomQty(defaultDecimal(line.getProductUomQty()));
            if (move.getQuantity() == null || !"done".equals(move.getState())) {
                move.setQuantity(BigDecimal.ZERO);
            }
            move.setLocationId(picking.getLocationId());
            move.setLocationDestId(picking.getLocationDestId());
            move.setOriginRef(order.getName());
            move.setSourceLineRef(line.getName());
            move.setCompanyId(line.getCompanyId() == null ? order.getCompanyId() : line.getCompanyId());
            if (!"done".equals(move.getState())) {
                move.setState("assigned");
            }
            if (move.getId() == null) {
                moveService.save(move);
            } else {
                moveService.updateById(move);
            }
        }
        for (StockMove move : existingMoves) {
            if ("done".equals(move.getState())) {
                continue;
            }
            String lineRef = move.getSourceLineRef() == null || move.getSourceLineRef().isBlank() ? move.getName() : move.getSourceLineRef();
            if (!activeLineRefs.contains(lineRef)) {
                moveService.removeById(move.getId());
            }
        }
    }

    private Long ensureDefaultLocationId(String usage, String name, Long companyId) {
        StockLocation existing = stockLocationMapper.selectOne(
            new LambdaQueryWrapper<StockLocation>()
                .eq(StockLocation::getUsage, usage)
                .eq(StockLocation::getCompanyId, companyId)
                .last("LIMIT 1")
        );
        if (existing != null) {
            return existing.getId();
        }
        StockLocation location = new StockLocation();
        location.setName(name);
        location.setUsage(usage);
        location.setCompanyId(companyId);
        stockLocationMapper.insert(location);
        return location.getId();
    }

    private void syncInvoiceArtifact(SaleOrder order, String action, boolean clearRef) {
        if (order.getName() == null || order.getName().isBlank()) {
            return;
        }
        AccountInvoice invoice = accountInvoiceMapper.selectOne(
            new LambdaQueryWrapper<AccountInvoice>().eq(AccountInvoice::getOriginRef, order.getName()).last("LIMIT 1")
        );
        if (invoice == null) {
            return;
        }
        accountInvoiceService.executeAction(invoice.getId(), action);
        if (clearRef) {
            lambdaUpdate()
                .eq(SaleOrder::getId, order.getId())
                .setSql("invoice_ref = NULL")
                .update();
        }
    }

    private void syncInvoiceArtifactFields(SaleOrder order, AccountInvoice invoice) {
        invoice.setOriginRef(order.getName());
        invoice.setPartnerId(order.getPartnerId());
        invoice.setCompanyId(order.getCompanyId());
        if (invoice.getInvoiceDate() == null) {
            invoice.setInvoiceDate(LocalDate.now());
        }
        if (invoice.getDueDate() == null) {
            invoice.setDueDate(invoice.getInvoiceDate());
        }
        if (!"posted".equals(invoice.getState()) && !"paid".equals(invoice.getPaymentState())) {
            invoice.setAmountUntaxed(defaultDecimal(order.getAmountUntaxed()));
            invoice.setAmountTax(defaultDecimal(order.getAmountTax()));
            invoice.setAmountTotal(defaultDecimal(order.getAmountTotal()));
            if (invoice.getPaymentState() == null || invoice.getPaymentState().isBlank()) {
                invoice.setPaymentState("not_paid");
            }
        }
        accountInvoiceMapper.updateById(invoice);
    }
}
