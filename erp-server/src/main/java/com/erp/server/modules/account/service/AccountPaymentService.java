package com.erp.server.modules.account.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.dto.AccountPaymentDto;
import com.erp.server.modules.account.dto.query.AccountPaymentQueryDto;
import com.erp.server.modules.account.entity.AccountInvoice;
import com.erp.server.modules.account.entity.AccountMove;
import com.erp.server.modules.account.entity.AccountMoveLine;
import com.erp.server.modules.account.entity.AccountPayment;
import com.erp.server.modules.account.mapper.AccountMoveLineMapper;
import com.erp.server.modules.account.mapper.AccountMoveMapper;
import com.erp.server.modules.account.mapper.AccountInvoiceMapper;
import com.erp.server.modules.account.mapper.AccountPaymentMapper;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AccountPaymentService extends BaseCrudDtoService<AccountPaymentMapper, AccountPayment, AccountPaymentDto, AccountPaymentQueryDto> {
    private final AccountInvoiceMapper accountInvoiceMapper;
    private final AccountMoveMapper accountMoveMapper;
    private final AccountMoveLineMapper accountMoveLineMapper;

    @Override public Class<AccountPayment> getEntityClass() { return AccountPayment.class; }
    @Override protected Class<AccountPaymentDto> getDtoClass() { return AccountPaymentDto.class; }

    @Override
    protected void beforeSaveDto(AccountPaymentDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, AccountPaymentDto dto) {
        applyDefaults(dto);
    }

    private void applyDefaults(AccountPaymentDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getDate() == null) {
            dto.setDate(LocalDate.now());
        }
        if (dto.getAmount() == null) {
            dto.setAmount(BigDecimal.ZERO);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean executeAction(Long id, String action) {
        AccountPayment payment = getById(id);
        if (payment == null) {
            return false;
        }
        if ("action_post".equals(action) || "post".equals(action)) {
            enrichFromInvoice(payment);
            payment.setJournalEntryRef(ensureJournalEntry(payment, "posted"));
            payment.setState("posted");
            boolean updated = updateById(payment);
            if (updated) {
                syncInvoice(payment, "paid", payment.getName());
            }
            return updated;
        }
        if ("action_cancel".equals(action) || "cancel".equals(action)) {
            payment.setJournalEntryRef(ensureJournalEntry(payment, "cancel"));
            payment.setState("cancel");
            boolean updated = updateById(payment);
            if (updated) {
                syncInvoice(payment, "not_paid", null);
            }
            return updated;
        }
        if ("action_draft".equals(action) || "draft".equals(action)) {
            payment.setJournalEntryRef(ensureJournalEntry(payment, "draft"));
            payment.setState("draft");
            boolean updated = updateById(payment);
            if (updated) {
                syncInvoice(payment, "not_paid", null);
            }
            return updated;
        }
        return super.executeAction(id, action);
    }

    private void syncInvoice(AccountPayment payment, String paymentState, String paymentRef) {
        if (payment.getInvoiceRef() == null || payment.getInvoiceRef().isBlank()) {
            return;
        }
        AccountInvoice invoice = accountInvoiceMapper.selectOne(
            new LambdaQueryWrapper<AccountInvoice>().eq(AccountInvoice::getName, payment.getInvoiceRef())
        );
        if (invoice == null) {
            return;
        }
        UpdateWrapper<AccountInvoice> updateWrapper = new UpdateWrapper<AccountInvoice>()
            .eq("id", invoice.getId())
            .set("payment_state", paymentState);
        if (paymentRef == null) {
            updateWrapper.setSql("payment_ref = NULL");
        } else {
            updateWrapper.set("payment_ref", paymentRef);
        }
        if ("paid".equals(paymentState)) {
            updateWrapper.set("state", "posted");
        }
        accountInvoiceMapper.update(null, updateWrapper);
    }

    private void enrichFromInvoice(AccountPayment payment) {
        if (payment.getInvoiceRef() == null || payment.getInvoiceRef().isBlank()) {
            return;
        }
        AccountInvoice invoice = accountInvoiceMapper.selectOne(
            new LambdaQueryWrapper<AccountInvoice>().eq(AccountInvoice::getName, payment.getInvoiceRef())
        );
        if (invoice == null) {
            return;
        }
        payment.setPartnerId(invoice.getPartnerId());
        payment.setAmount(invoice.getAmountTotal() == null ? BigDecimal.ZERO : invoice.getAmountTotal());
        payment.setDate(invoice.getInvoiceDate() == null ? LocalDate.now() : invoice.getInvoiceDate());
        payment.setCompanyId(invoice.getCompanyId());
        payment.setOriginRef(invoice.getOriginRef());
        if (payment.getMemo() == null || payment.getMemo().isBlank()) {
            payment.setMemo(invoice.getName());
        }
        if (payment.getPaymentType() == null || payment.getPaymentType().isBlank()) {
            payment.setPaymentType(invoice.getName() != null && invoice.getName().startsWith("BILL/") ? "outbound" : "inbound");
        }
    }

    private String ensureJournalEntry(AccountPayment payment, String targetState) {
        String moveName = payment.getJournalEntryRef();
        if (moveName == null || moveName.isBlank()) {
            moveName = "MOVE/" + payment.getName();
        }
        AccountMove move = accountMoveMapper.selectOne(
            new LambdaQueryWrapper<AccountMove>().eq(AccountMove::getName, moveName)
        );
        if (move == null) {
            move = new AccountMove();
            move.setName(moveName);
        }

        BigDecimal amount = defaultDecimal(payment.getAmount());
        move.setRef(payment.getName());
        move.setState(targetState);
        move.setMoveType("entry");
        move.setDate((payment.getDate() == null ? LocalDate.now() : payment.getDate()).atStartOfDay());
        move.setPartnerId(payment.getPartnerId());
        move.setJournalId(payment.getJournalId());
        move.setCompanyId(payment.getCompanyId());
        move.setAmountTotal(amount.abs());

        if (move.getId() == null) {
            accountMoveMapper.insert(move);
        } else {
            accountMoveMapper.updateById(move);
        }
        persistJournalEntryLines(move, payment, targetState);
        return moveName;
    }

    private void persistJournalEntryLines(AccountMove move, AccountPayment payment, String targetState) {
        accountMoveLineMapper.delete(new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, move.getId()));
        BigDecimal amount = defaultDecimal(payment.getAmount()).abs();
        AccountMoveLine debitLine = buildPaymentLine(
            move,
            payment,
            targetState,
            payment.getPaymentType() != null && payment.getPaymentType().equals("outbound") ? amount.negate() : amount,
            payment.getName() + "-PAYABLE"
        );
        AccountMoveLine creditLine = buildPaymentLine(
            move,
            payment,
            targetState,
            payment.getPaymentType() != null && payment.getPaymentType().equals("outbound") ? amount : amount.negate(),
            payment.getName() + "-BANK"
        );
        debitLine.setAccountId(1L);
        creditLine.setAccountId(2L);
        accountMoveLineMapper.insert(debitLine);
        accountMoveLineMapper.insert(creditLine);
    }

    private AccountMoveLine buildPaymentLine(AccountMove move, AccountPayment payment, String targetState, BigDecimal balance, String name) {
        AccountMoveLine line = new AccountMoveLine();
        line.setMoveId(move.getId());
        line.setName(name);
        line.setBalance(balance);
        if (balance.compareTo(BigDecimal.ZERO) >= 0) {
            line.setDebit(balance);
            line.setCredit(BigDecimal.ZERO);
        } else {
            line.setDebit(BigDecimal.ZERO);
            line.setCredit(balance.abs());
        }
        line.setResidualAmount("posted".equals(targetState) ? defaultDecimal(balance).abs() : BigDecimal.ZERO);
        line.setReconciled(
            "posted".equals(targetState)
                ? "open"
                : "cancel".equals(targetState)
                    ? "cancelled"
                    : "draft"
        );
        line.setPaymentRef(payment.getName());
        line.setCompanyId(payment.getCompanyId());
        return line;
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
