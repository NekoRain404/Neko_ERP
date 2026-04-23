package com.erp.server.modules.purchase.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.entity.AccountInvoice;
import com.erp.server.modules.account.mapper.AccountInvoiceMapper;
import com.erp.server.modules.account.service.AccountInvoiceService;
import com.erp.server.modules.purchase.dto.PurchaseOrderDto;
import com.erp.server.modules.purchase.dto.query.PurchaseOrderQueryDto;
import com.erp.server.modules.purchase.entity.PurchaseOrder;
import com.erp.server.modules.purchase.entity.PurchaseOrderLine;
import com.erp.server.modules.purchase.mapper.PurchaseOrderLineMapper;
import com.erp.server.modules.purchase.mapper.PurchaseOrderMapper;
import com.erp.server.modules.stock.entity.StockLocation;
import com.erp.server.modules.stock.entity.StockMove;
import com.erp.server.modules.stock.entity.StockPicking;
import com.erp.server.modules.stock.mapper.StockLocationMapper;
import com.erp.server.modules.stock.service.StockMoveService;
import com.erp.server.modules.stock.service.StockPickingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService extends BaseCrudDtoService<PurchaseOrderMapper, PurchaseOrder, PurchaseOrderDto, PurchaseOrderQueryDto> {

    private final AccountInvoiceMapper accountInvoiceMapper;
    private final AccountInvoiceService accountInvoiceService;
    private final PurchaseOrderLineMapper lineMapper;
    private final StockPickingService pickingService;
    private final StockMoveService moveService;
    private final StockLocationMapper stockLocationMapper;

    @Override public Class<PurchaseOrder> getEntityClass() { return PurchaseOrder.class; }
    @Override protected Class<PurchaseOrderDto> getDtoClass() { return PurchaseOrderDto.class; }

    @Override
    protected void beforeSaveDto(PurchaseOrderDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, PurchaseOrderDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(PurchaseOrderDto dto) {
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
        PurchaseOrder order = getById(id);
        if (order == null) {
            return false;
        }

        if ("action_confirm".equals(action)) {
            order.setState("purchase");
            StockPicking picking = ensureReceiptArtifact(order);
            order.setReceiptRef(picking.getName());
            boolean updated = updateById(order);
            if (updated) {
                syncOrderLines(order.getId(), "purchase");
                syncReceiptMoves(order, picking);
            }
            return updated;
        }
        if ("action_send_rfq".equals(action)) {
            order.setState("sent");
            boolean updated = updateById(order);
            if (updated) {
                syncOrderLines(order.getId(), "sent");
            }
            return updated;
        }
        if ("action_cancel".equals(action) || "cancel".equals(action)) {
            order.setState("cancel");
            boolean updated = updateById(order);
            if (updated) {
                syncOrderLines(order.getId(), "cancel");
                syncReceiptArtifact(order, "cancel", false);
                syncBillArtifact(order, "cancel", false);
            }
            return updated;
        }
        if ("action_draft".equals(action) || "draft".equals(action)) {
            order.setState("draft");
            boolean updated = lambdaUpdate()
                .eq(PurchaseOrder::getId, order.getId())
                .set(PurchaseOrder::getState, "draft")
                .setSql("receipt_ref = NULL, bill_ref = NULL")
                .update();
            if (updated) {
                syncOrderLines(order.getId(), "draft");
                syncReceiptArtifact(order, "draft", true);
                syncBillArtifact(order, "draft", true);
            }
            return updated;
        }
        if ("action_create_bill".equals(action)) {
            String billName = "BILL/" + order.getName();
            AccountInvoice existing = accountInvoiceMapper.selectOne(
                new LambdaQueryWrapper<AccountInvoice>().eq(AccountInvoice::getName, billName)
            );
            if (existing != null) {
                syncBillArtifactFields(order, existing);
                if (order.getBillRef() == null || order.getBillRef().isBlank()) {
                    order.setBillRef(existing.getName());
                    updateById(order);
                }
                return true;
            }
            AccountInvoice invoice = new AccountInvoice();
            invoice.setName(billName);
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
            boolean inserted = accountInvoiceMapper.insert(invoice) > 0;
            if (inserted) {
                order.setBillRef(invoice.getName());
                updateById(order);
            }
            return inserted;
        }
        return super.executeAction(id, action);
    }

    private void syncBillArtifact(PurchaseOrder order, String action, boolean clearRef) {
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
                .eq(PurchaseOrder::getId, order.getId())
                .setSql("bill_ref = NULL")
                .update();
        }
    }

    private void syncReceiptArtifact(PurchaseOrder order, String action, boolean clearRef) {
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
                .eq(PurchaseOrder::getId, order.getId())
                .setSql("receipt_ref = NULL")
                .update();
        }
    }

    private void syncOrderLines(Long orderId, String state) {
        for (PurchaseOrderLine line : lineMapper.selectList(
            new LambdaQueryWrapper<PurchaseOrderLine>().eq(PurchaseOrderLine::getOrderId, orderId)
        )) {
            line.setState(state);
            lineMapper.updateById(line);
        }
    }

    private StockPicking ensureReceiptArtifact(PurchaseOrder order) {
        StockPicking picking = pickingService.getOne(
            new LambdaQueryWrapper<StockPicking>().eq(StockPicking::getOrigin, order.getName()).last("LIMIT 1")
        );
        Long sourceLocationId = ensureDefaultLocationId("vendor", "Vendors", order.getCompanyId());
        Long destLocationId = ensureDefaultLocationId("internal", "WH/Stock", order.getCompanyId());
        if (picking == null) {
            picking = new StockPicking();
            picking.setName("WH/IN/" + order.getName());
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

    private void syncReceiptMoves(PurchaseOrder order, StockPicking picking) {
        List<PurchaseOrderLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<PurchaseOrderLine>().eq(PurchaseOrderLine::getOrderId, order.getId())
        );
        List<StockMove> existingMoves = moveService.list(
            new LambdaQueryWrapper<StockMove>().eq(StockMove::getPickingId, picking.getId())
        );
        Set<String> activeLineRefs = lines.stream()
            .map(PurchaseOrderLine::getName)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        for (PurchaseOrderLine line : lines) {
            StockMove move = existingMoves.stream()
                .filter(candidate -> Objects.equals(candidate.getSourceLineRef(), line.getName()) || Objects.equals(candidate.getName(), line.getName()))
                .findFirst()
                .orElseGet(StockMove::new);
            move.setName(line.getName());
            move.setPickingId(picking.getId());
            move.setProductId(line.getProductId());
            move.setProductUomQty(defaultDecimal(line.getProductQty()));
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

    private void syncBillArtifactFields(PurchaseOrder order, AccountInvoice invoice) {
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
