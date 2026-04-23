package com.erp.server.modules.account.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.dto.AccountInvoiceDto;
import com.erp.server.modules.account.dto.query.AccountInvoiceQueryDto;
import com.erp.server.modules.account.entity.AccountInvoice;
import com.erp.server.modules.account.entity.AccountPayment;
import com.erp.server.modules.account.mapper.AccountInvoiceMapper;
import com.erp.server.modules.account.mapper.AccountPaymentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountInvoiceService extends BaseCrudDtoService<AccountInvoiceMapper, AccountInvoice, AccountInvoiceDto, AccountInvoiceQueryDto> {

    private final AccountPaymentMapper accountPaymentMapper;

    @Override public Class<AccountInvoice> getEntityClass() { return AccountInvoice.class; }
    @Override protected Class<AccountInvoiceDto> getDtoClass() { return AccountInvoiceDto.class; }

    @Override
    protected void beforeSaveDto(AccountInvoiceDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, AccountInvoiceDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(AccountInvoiceDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getPaymentState() == null || dto.getPaymentState().isBlank()) {
            dto.setPaymentState("not_paid");
        }
        if (dto.getInvoiceDate() == null) {
            dto.setInvoiceDate(LocalDate.now());
        }
        if (dto.getDueDate() == null) {
            dto.setDueDate(dto.getInvoiceDate());
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
        AccountInvoice invoice = getById(id);
        if (invoice == null) {
            return false;
        }
        if ("post".equals(action)) {
            invoice.setState("posted");
            return updateById(invoice);
        }
        if ("register_payment".equals(action)) {
            String paymentName = "PAY/" + invoice.getName();
            invoice.setState("posted");
            invoice.setPaymentState("paid");
            invoice.setPaymentRef(paymentName);
            boolean updated = updateById(invoice);
            if (!updated) {
                return false;
            }
            ensurePaymentArtifact(invoice);
            return true;
        }
        if ("cancel".equals(action)) {
            invoice.setState("cancel");
            invoice.setPaymentState("not_paid");
            boolean updated = baseMapper.update(
                null,
                new UpdateWrapper<AccountInvoice>()
                    .eq("id", invoice.getId())
                    .set("state", "cancel")
                    .set("payment_state", "not_paid")
                    .set("payment_ref", null)
            ) > 0;
            if (updated) {
                rollbackPaymentArtifact(invoice, "cancel");
            }
            return updated;
        }
        if ("draft".equals(action) || "action_draft".equals(action)) {
            invoice.setState("draft");
            invoice.setPaymentState("not_paid");
            boolean updated = baseMapper.update(
                null,
                new UpdateWrapper<AccountInvoice>()
                    .eq("id", invoice.getId())
                    .set("state", "draft")
                    .set("payment_state", "not_paid")
                    .set("payment_ref", null)
            ) > 0;
            if (updated) {
                rollbackPaymentArtifact(invoice, "draft");
            }
            return updated;
        }
        return applyStateAction(invoice, action);
    }

    private void ensurePaymentArtifact(AccountInvoice invoice) {
        String paymentName = "PAY/" + invoice.getName();
        AccountPayment existing = findLatestPaymentArtifact(paymentName);
        if (existing != null) {
            existing.setInvoiceRef(invoice.getName());
            existing.setOriginRef(invoice.getOriginRef());
            existing.setPartnerId(invoice.getPartnerId());
            existing.setAmount(defaultDecimal(invoice.getAmountTotal()));
            existing.setDate(invoice.getInvoiceDate() == null ? LocalDate.now() : invoice.getInvoiceDate());
            existing.setCompanyId(invoice.getCompanyId());
            existing.setMemo(invoice.getName());
            existing.setPaymentType(resolvePaymentType(invoice));
            if (existing.getState() == null || existing.getState().isBlank() || "draft".equals(existing.getState())) {
                existing.setState("posted");
            }
            accountPaymentMapper.updateById(existing);
            return;
        }

        AccountPayment payment = new AccountPayment();
        payment.setName(paymentName);
        payment.setState("posted");
        payment.setPaymentType(resolvePaymentType(invoice));
        payment.setPartnerId(invoice.getPartnerId());
        payment.setAmount(defaultDecimal(invoice.getAmountTotal()));
        payment.setDate(invoice.getInvoiceDate() == null ? LocalDate.now() : invoice.getInvoiceDate());
        payment.setMemo(invoice.getName());
        payment.setInvoiceRef(invoice.getName());
        payment.setOriginRef(invoice.getOriginRef());
        payment.setCompanyId(invoice.getCompanyId());
        accountPaymentMapper.insert(payment);
    }

    private void rollbackPaymentArtifact(AccountInvoice invoice, String targetState) {
        String paymentName = "PAY/" + invoice.getName();
        AccountPayment existing = findLatestPaymentArtifact(paymentName);
        if (existing == null) {
            return;
        }
        existing.setState(targetState);
        accountPaymentMapper.updateById(existing);
    }

    private AccountPayment findLatestPaymentArtifact(String paymentName) {
        List<AccountPayment> payments = accountPaymentMapper.selectList(
            new LambdaQueryWrapper<AccountPayment>()
                .eq(AccountPayment::getName, paymentName)
                .orderByDesc(AccountPayment::getId)
                .last("LIMIT 1")
        );
        return payments.isEmpty() ? null : payments.get(0);
    }

    private String resolvePaymentType(AccountInvoice invoice) {
        String invoiceName = invoice.getName() == null ? "" : invoice.getName();
        return invoiceName.startsWith("BILL/") ? "outbound" : "inbound";
    }
}
