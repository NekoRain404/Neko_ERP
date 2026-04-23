package com.erp.server.modules.purchase.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.purchase.entity.PurchaseOrder;
import com.erp.server.modules.purchase.entity.PurchaseOrderLine;
import com.erp.server.modules.purchase.dto.PurchaseOrderLineDto;
import com.erp.server.modules.purchase.dto.query.PurchaseOrderLineQueryDto;
import com.erp.server.modules.purchase.mapper.PurchaseOrderMapper;
import com.erp.server.modules.purchase.mapper.PurchaseOrderLineMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseOrderLineService extends BaseCrudDtoService<PurchaseOrderLineMapper, PurchaseOrderLine, PurchaseOrderLineDto, PurchaseOrderLineQueryDto> {

    private final PurchaseOrderMapper orderMapper;

    @Override public Class<PurchaseOrderLine> getEntityClass() { return PurchaseOrderLine.class; }
    @Override protected Class<PurchaseOrderLineDto> getDtoClass() { return PurchaseOrderLineDto.class; }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveDto(PurchaseOrderLineDto dto) {
        computeSubtotal(dto);
        boolean res = super.saveDto(dto);
        if (res && dto.getOrderId() != null) {
            recomputeOrderTotal(dto.getOrderId());
        }
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean updateDto(Long id, PurchaseOrderLineDto dto) {
        computeSubtotal(dto);
        boolean res = super.updateDto(id, dto);
        PurchaseOrderLine entity = getById(id);
        if (res && entity != null && entity.getOrderId() != null) {
            recomputeOrderTotal(entity.getOrderId());
        }
        return res;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean removeById(Serializable id) {
        PurchaseOrderLine entity = getById(id);
        boolean res = super.removeById(id);
        if (res && entity != null && entity.getOrderId() != null) {
            recomputeOrderTotal(entity.getOrderId());
        }
        return res;
    }

    private void computeSubtotal(PurchaseOrderLineDto dto) {
        BigDecimal qty = dto.getProductQty() != null ? dto.getProductQty() : BigDecimal.ZERO;
        BigDecimal price = dto.getPriceUnit() != null ? dto.getPriceUnit() : BigDecimal.ZERO;
        BigDecimal subtotal = qty.multiply(price);
        dto.setPriceSubtotal(subtotal);
        dto.setPriceTotal(subtotal);
    }

    private void recomputeOrderTotal(Long orderId) {
        List<PurchaseOrderLine> lines = baseMapper.selectList(
            new LambdaQueryWrapper<PurchaseOrderLine>().eq(PurchaseOrderLine::getOrderId, orderId)
        );
        BigDecimal total = lines.stream()
            .map(line -> line.getPriceSubtotal() != null ? line.getPriceSubtotal() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        PurchaseOrder order = new PurchaseOrder();
        order.setId(orderId);
        order.setAmountUntaxed(total);
        order.setAmountTax(BigDecimal.ZERO);
        order.setAmountTotal(total);
        orderMapper.updateById(order);
    }
}
