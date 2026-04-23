package com.erp.server.modules.sale.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.sale.entity.SaleOrder;
import com.erp.server.modules.sale.entity.SaleOrderLine;
import com.erp.server.modules.sale.dto.SaleOrderLineDto;
import com.erp.server.modules.sale.dto.query.SaleOrderLineQueryDto;
import com.erp.server.modules.sale.mapper.SaleOrderMapper;
import com.erp.server.modules.sale.mapper.SaleOrderLineMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SaleOrderLineService extends BaseCrudDtoService<SaleOrderLineMapper, SaleOrderLine, SaleOrderLineDto, SaleOrderLineQueryDto> {

    private final SaleOrderMapper orderMapper;

    @Override public Class<SaleOrderLine> getEntityClass() { return SaleOrderLine.class; }
    @Override protected Class<SaleOrderLineDto> getDtoClass() { return SaleOrderLineDto.class; }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveDto(SaleOrderLineDto dto) {
        computeSubtotal(dto);
        boolean res = super.saveDto(dto);
        if (res && dto.getOrderId() != null) {
            recomputeOrderTotal(dto.getOrderId());
        }
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean updateDto(Long id, SaleOrderLineDto dto) {
        computeSubtotal(dto);
        boolean res = super.updateDto(id, dto);
        SaleOrderLine entity = getById(id);
        if (res && entity != null && entity.getOrderId() != null) {
            recomputeOrderTotal(entity.getOrderId());
        }
        return res;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean removeById(Serializable id) {
        SaleOrderLine entity = getById(id);
        boolean res = super.removeById(id);
        if (res && entity != null && entity.getOrderId() != null) {
            recomputeOrderTotal(entity.getOrderId());
        }
        return res;
    }

    private void computeSubtotal(SaleOrderLineDto dto) {
        BigDecimal qty = dto.getProductUomQty() != null ? dto.getProductUomQty() : BigDecimal.ZERO;
        BigDecimal price = dto.getPriceUnit() != null ? dto.getPriceUnit() : BigDecimal.ZERO;
        BigDecimal subtotal = qty.multiply(price);
        dto.setPriceSubtotal(subtotal);
        dto.setPriceTotal(subtotal);
    }

    private void recomputeOrderTotal(Long orderId) {
        List<SaleOrderLine> lines = baseMapper.selectList(
            new LambdaQueryWrapper<SaleOrderLine>().eq(SaleOrderLine::getOrderId, orderId)
        );
        BigDecimal total = lines.stream()
            .map(line -> line.getPriceSubtotal() != null ? line.getPriceSubtotal() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        SaleOrder order = new SaleOrder();
        order.setId(orderId);
        order.setAmountUntaxed(total);
        order.setAmountTax(BigDecimal.ZERO);
        order.setAmountTotal(total);
        orderMapper.updateById(order);
    }
}
