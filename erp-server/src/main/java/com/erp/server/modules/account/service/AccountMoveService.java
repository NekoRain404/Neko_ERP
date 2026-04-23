package com.erp.server.modules.account.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.entity.AccountMoveLine;
import com.erp.server.modules.account.dto.AccountMoveLineDto;
import com.erp.server.modules.account.dto.AccountMoveDto;
import com.erp.server.common.util.BeanCopyUtils;
import com.erp.server.modules.account.entity.AccountMove;
import com.erp.server.modules.account.dto.query.AccountMoveQueryDto;
import com.erp.server.modules.account.mapper.AccountMoveMapper;
import com.erp.server.modules.account.mapper.AccountMoveLineMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountMoveService extends BaseCrudDtoService<AccountMoveMapper, AccountMove, AccountMoveDto, AccountMoveQueryDto> {

    private final AccountMoveLineMapper lineMapper;

    @Override public Class<AccountMove> getEntityClass() { return AccountMove.class; }
    @Override protected Class<AccountMoveDto> getDtoClass() { return AccountMoveDto.class; }

    @Override
    protected void beforeSaveDto(AccountMoveDto dto) {
        applyDefaults(dto);
    }

    @Override
    protected void beforeUpdateDto(Serializable id, AccountMoveDto dto) {
        applyDefaults(dto);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveDto(AccountMoveDto dto) {
        beforeSaveDto(dto);
        AccountMove entity = toEntity(dto);
        boolean saved = save(entity);
        if (!saved) {
            return false;
        }
        persistMoveLines(entity.getId(), dto.getLineIds(), entity.getCompanyId());
        syncMoveLineSemantics(entity);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateDto(Serializable id, AccountMoveDto dto) {
        beforeUpdateDto(id, dto);
        AccountMove entity = getById(id);
        if (entity == null) {
            return false;
        }
        BeanCopyUtils.copyNonNullProperties(dto, entity);
        BeanCopyUtils.setFieldValue(entity, "id", id);
        boolean updated = updateById(entity);
        if (!updated) {
            return false;
        }
        persistMoveLines((Long) id, dto.getLineIds(), entity.getCompanyId());
        syncMoveLineSemantics(entity);
        return true;
    }

    private void applyDefaults(AccountMoveDto dto) {
        if (dto.getState() == null || dto.getState().isBlank()) {
            dto.setState("draft");
        }
        if (dto.getDate() == null) {
            dto.setDate(LocalDateTime.now());
        }
        dto.setLineIds(normalizeLines(
            dto.getLineIds(),
            dto.getCompanyId(),
            dto.getName(),
            dto.getState(),
            dto.getRef(),
            dto.getReversedEntryRef(),
            dto.getReversedFromRef()
        ));
        if (dto.getLineIds() != null && !dto.getLineIds().isEmpty()) {
            dto.setAmountTotal(sumLineDisplayTotal(dto));
        } else if (dto.getAmountTotal() == null) {
            dto.setAmountTotal(sumLineDisplayTotal(dto));
        }
    }

    private BigDecimal sumLineDisplayTotal(AccountMoveDto dto) {
        if (dto.getLineIds() == null || dto.getLineIds().isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;
        for (AccountMoveLineDto line : dto.getLineIds()) {
            totalDebit = totalDebit.add(defaultDecimal(line.getDebit()));
            totalCredit = totalCredit.add(defaultDecimal(line.getCredit()));
        }
        return totalDebit.max(totalCredit).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private List<AccountMoveLineDto> normalizeLines(
        List<AccountMoveLineDto> lineDtos,
        Long companyId,
        String moveName,
        String moveState,
        String moveRef,
        String reversedEntryRef,
        String reversedFromRef
    ) {
        if (lineDtos == null || lineDtos.isEmpty()) {
            return lineDtos;
        }
        List<AccountMoveLineDto> normalized = new ArrayList<>();
        for (int i = 0; i < lineDtos.size(); i++) {
            AccountMoveLineDto line = BeanCopyUtils.copy(lineDtos.get(i), AccountMoveLineDto.class);
            BigDecimal debit = defaultDecimal(line.getDebit()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal credit = defaultDecimal(line.getCredit()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal balance = line.getBalance();
            if (balance == null) {
                balance = debit.subtract(credit);
            }
            balance = defaultDecimal(balance).setScale(2, RoundingMode.HALF_UP);
            if (debit.compareTo(BigDecimal.ZERO) == 0 && credit.compareTo(BigDecimal.ZERO) == 0 && balance.compareTo(BigDecimal.ZERO) != 0) {
                if (balance.compareTo(BigDecimal.ZERO) >= 0) {
                    debit = balance;
                } else {
                    credit = balance.abs();
                }
            }
            if (line.getName() == null || line.getName().isBlank()) {
                line.setName((moveName == null || moveName.isBlank() ? "MOVE" : moveName) + "-LINE-" + (i + 1));
            }
            if (line.getCompanyId() == null) {
                line.setCompanyId(companyId);
            }
            line.setDebit(debit);
            line.setCredit(credit);
            line.setBalance(balance);
            line.setResidualAmount(resolveResidualAmount(moveState, balance, line.getResidualAmount(), line.getReconciled()));
            line.setReconciled(resolveReconciledState(moveState, balance, reversedEntryRef, reversedFromRef, line.getResidualAmount(), line.getReconciled()));
            line.setPaymentRef(resolvePaymentRef(moveState, moveRef));
            normalized.add(line);
        }
        return normalized;
    }

    @Override
    public AccountMoveDto toDto(AccountMove entity) {
        if (entity == null) return null;
        AccountMoveDto dto = super.toDto(entity);
        List<AccountMoveLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, entity.getId())
        );
        dto.setLineIds(lines.stream().map(l -> BeanCopyUtils.copy(l, AccountMoveLineDto.class)).collect(Collectors.toList()));
        return dto;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean executeAction(Long id, String action) {
        AccountMove move = getById(id);
        if (move == null) return false;

        if ("action_post".equals(action) || "post".equals(action)) {
            move.setState("posted");
            boolean updated = updateById(move);
            if (updated) {
                syncMoveLineSemantics(move);
            }
            return updated;
        }
        if ("reverse".equals(action) || "action_reverse".equals(action)) {
            String reverseName = ensureReverseEntry(move);
            move.setReversedEntryRef(reverseName);
            move.setState("reversed");
            boolean updated = updateById(move);
            if (updated) {
                syncMoveLineSemantics(move);
                AccountMove reverseMove = baseMapper.selectOne(
                    new LambdaQueryWrapper<AccountMove>().eq(AccountMove::getName, reverseName)
                );
                if (reverseMove != null) {
                    syncMoveLineSemantics(reverseMove);
                }
            }
            return updated;
        }
        if ("action_reconcile".equals(action) || "reconcile".equals(action)) {
            if (!"posted".equals(move.getState())) {
                return false;
            }
            markMoveLinesReconciled(move, true);
            return true;
        }
        if ("action_unreconcile".equals(action) || "unreconcile".equals(action)) {
            if (!"posted".equals(move.getState())) {
                return false;
            }
            markMoveLinesReconciled(move, false);
            return true;
        }
        if ("cancel".equals(action) || "action_cancel".equals(action)) {
            move.setState("cancel");
            boolean updated = updateById(move);
            if (updated) {
                syncMoveLineSemantics(move);
            }
            return updated;
        }
        if ("draft".equals(action) || "action_draft".equals(action)) {
            move.setState("draft");
            boolean updated = baseMapper.update(
                null,
                new UpdateWrapper<AccountMove>()
                    .eq("id", move.getId())
                    .set("state", "draft")
                    .set("reversed_entry_ref", null)
            ) > 0;
            if (updated) {
                cancelReverseEntry(move);
                syncMoveLineSemantics(move);
            }
            return updated;
        }
        return super.executeAction(id, action);
    }

    private String ensureReverseEntry(AccountMove move) {
        String reverseName = "REV/" + move.getName();
        AccountMove existing = baseMapper.selectOne(
            new LambdaQueryWrapper<AccountMove>().eq(AccountMove::getName, reverseName)
        );
        if (existing != null) {
            if (existing.getReversedFromRef() == null || existing.getReversedFromRef().isBlank()) {
                existing.setReversedFromRef(move.getName());
                baseMapper.updateById(existing);
            }
            ensureReverseLines(move, existing);
            return reverseName;
        }

        AccountMove reverseMove = new AccountMove();
        reverseMove.setName(reverseName);
        reverseMove.setRef(move.getName());
        reverseMove.setState("posted");
        reverseMove.setMoveType(move.getMoveType());
        reverseMove.setDate(LocalDateTime.now());
        reverseMove.setPartnerId(move.getPartnerId());
        reverseMove.setJournalId(move.getJournalId());
        reverseMove.setReversedFromRef(move.getName());
        reverseMove.setCompanyId(move.getCompanyId());
        reverseMove.setAmountTotal(defaultDecimal(move.getAmountTotal()).negate());
        baseMapper.insert(reverseMove);
        ensureReverseLines(move, reverseMove);
        return reverseName;
    }

    private void cancelReverseEntry(AccountMove move) {
        String reverseName = "REV/" + move.getName();
        AccountMove existing = baseMapper.selectOne(
            new LambdaQueryWrapper<AccountMove>().eq(AccountMove::getName, reverseName)
        );
        if (existing == null) {
            return;
        }
        existing.setState("cancel");
        baseMapper.updateById(existing);
    }

    private void persistMoveLines(Long moveId, List<AccountMoveLineDto> lineDtos, Long companyId) {
        lineMapper.delete(new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, moveId));
        if (lineDtos == null || lineDtos.isEmpty()) {
            return;
        }
        for (AccountMoveLineDto dto : lineDtos) {
            AccountMoveLine line = BeanCopyUtils.copy(dto, AccountMoveLine.class);
            line.setId(null);
            line.setMoveId(moveId);
            if (line.getCompanyId() == null) {
                line.setCompanyId(companyId);
            }
            lineMapper.insert(line);
        }
    }

    private void ensureReverseLines(AccountMove originalMove, AccountMove reverseMove) {
        List<AccountMoveLine> existingReverseLines = lineMapper.selectList(
            new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, reverseMove.getId())
        );
        if (!existingReverseLines.isEmpty()) {
            return;
        }
        List<AccountMoveLine> originalLines = lineMapper.selectList(
            new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, originalMove.getId())
        );
        for (AccountMoveLine originalLine : originalLines) {
            AccountMoveLine reverseLine = new AccountMoveLine();
            reverseLine.setMoveId(reverseMove.getId());
            reverseLine.setName(originalLine.getName());
            reverseLine.setAccountId(originalLine.getAccountId());
            reverseLine.setProductId(originalLine.getProductId());
            reverseLine.setDebit(defaultDecimal(originalLine.getCredit()));
            reverseLine.setCredit(defaultDecimal(originalLine.getDebit()));
            reverseLine.setBalance(defaultDecimal(originalLine.getBalance()).negate());
            reverseLine.setResidualAmount(BigDecimal.ZERO);
            reverseLine.setReconciled("reversed");
            reverseLine.setCompanyId(originalLine.getCompanyId() == null ? reverseMove.getCompanyId() : originalLine.getCompanyId());
            lineMapper.insert(reverseLine);
        }
    }

    private void syncMoveLineSemantics(AccountMove move) {
        List<AccountMoveLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, move.getId())
        );
        for (AccountMoveLine line : lines) {
            BigDecimal balance = line.getBalance() == null
                ? defaultDecimal(line.getDebit()).subtract(defaultDecimal(line.getCredit()))
                : defaultDecimal(line.getBalance());
            line.setBalance(balance);
            line.setResidualAmount(resolveResidualAmount(move.getState(), balance, line.getResidualAmount(), line.getReconciled()));
            line.setReconciled(resolveReconciledState(move.getState(), balance, move.getReversedEntryRef(), move.getReversedFromRef(), line.getResidualAmount(), line.getReconciled()));
            line.setPaymentRef(resolvePaymentRef(move.getState(), move.getRef()));
            if (line.getCompanyId() == null) {
                line.setCompanyId(move.getCompanyId());
            }
            lineMapper.updateById(line);
        }
    }

    private void markMoveLinesReconciled(AccountMove move, boolean reconciled) {
        List<AccountMoveLine> lines = lineMapper.selectList(
            new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, move.getId())
        );
        for (AccountMoveLine line : lines) {
            BigDecimal balance = line.getBalance() == null
                ? defaultDecimal(line.getDebit()).subtract(defaultDecimal(line.getCredit()))
                : defaultDecimal(line.getBalance());
            line.setResidualAmount(reconciled ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : defaultDecimal(balance).abs().setScale(2, RoundingMode.HALF_UP));
            line.setReconciled(reconciled ? "matched" : "open");
            lineMapper.updateById(line);
        }
    }

    private BigDecimal resolveResidualAmount(String moveState, BigDecimal balance, BigDecimal currentResidualAmount, String currentReconciled) {
        if ("cancel".equals(moveState) || "reversed".equals(moveState)) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if ("posted".equals(moveState) && ("matched".equals(currentReconciled) || defaultDecimal(currentResidualAmount).compareTo(BigDecimal.ZERO) == 0)) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return defaultDecimal(balance).abs().setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveReconciledState(String moveState, BigDecimal balance, String reversedEntryRef, String reversedFromRef, BigDecimal currentResidualAmount, String currentReconciled) {
        if ("draft".equals(moveState)) {
            return "draft";
        }
        if ("cancel".equals(moveState)) {
            return "cancelled";
        }
        if ("reversed".equals(moveState) || (reversedEntryRef != null && !reversedEntryRef.isBlank()) || (reversedFromRef != null && !reversedFromRef.isBlank())) {
            return "reversed";
        }
        if ("matched".equals(currentReconciled) || defaultDecimal(currentResidualAmount).compareTo(BigDecimal.ZERO) == 0) {
            return "matched";
        }
        if (defaultDecimal(balance).compareTo(BigDecimal.ZERO) == 0) {
            return "matched";
        }
        return "open";
    }

    private String resolvePaymentRef(String moveState, String moveRef) {
        if (!"posted".equals(moveState) || moveRef == null || moveRef.isBlank()) {
            return null;
        }
        return moveRef.startsWith("PAY/") ? moveRef : null;
    }
}
