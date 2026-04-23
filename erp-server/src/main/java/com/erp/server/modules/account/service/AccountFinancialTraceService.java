package com.erp.server.modules.account.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.server.modules.account.dto.AccountFinancialTraceCockpitDto;
import com.erp.server.modules.account.dto.AccountFinancialTraceDetailDto;
import com.erp.server.modules.account.dto.AccountFinancialTraceLinkDto;
import com.erp.server.modules.account.dto.AccountFinancialTraceRecordDto;
import com.erp.server.modules.account.entity.AccountInvoice;
import com.erp.server.modules.account.entity.AccountMove;
import com.erp.server.modules.account.entity.AccountMoveLine;
import com.erp.server.modules.account.entity.AccountPayment;
import com.erp.server.modules.account.mapper.AccountInvoiceMapper;
import com.erp.server.modules.account.mapper.AccountMoveLineMapper;
import com.erp.server.modules.account.mapper.AccountMoveMapper;
import com.erp.server.modules.account.mapper.AccountPaymentMapper;
import com.erp.server.modules.base.entity.IrAttachment;
import com.erp.server.modules.base.entity.IrLogging;
import com.erp.server.modules.base.entity.IrNote;
import com.erp.server.modules.base.mapper.IrAttachmentMapper;
import com.erp.server.modules.base.mapper.IrLoggingMapper;
import com.erp.server.modules.base.mapper.IrNoteMapper;
import com.erp.server.modules.purchase.entity.PurchaseOrder;
import com.erp.server.modules.purchase.mapper.PurchaseOrderMapper;
import com.erp.server.modules.sale.entity.SaleOrder;
import com.erp.server.modules.sale.mapper.SaleOrderMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountFinancialTraceService {

    private final AccountInvoiceMapper accountInvoiceMapper;
    private final AccountPaymentMapper accountPaymentMapper;
    private final AccountMoveMapper accountMoveMapper;
    private final AccountMoveLineMapper accountMoveLineMapper;
    private final SaleOrderMapper saleOrderMapper;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final IrNoteMapper irNoteMapper;
    private final IrAttachmentMapper irAttachmentMapper;
    private final IrLoggingMapper irLoggingMapper;

    public AccountFinancialTraceCockpitDto getCockpit(String moduleKey, Integer limit) {
        // 先按模块输出最小真实驾驶舱，避免财务追溯长期停留在前端静态摘要。
        int safeLimit = normalizeLimit(limit);
        String normalizedModuleKey = moduleKey == null ? "" : moduleKey.trim();
        List<AccountFinancialTraceRecordDto> records;
        if ("accountInvoice".equals(normalizedModuleKey)) {
            records = buildInvoiceRecords(safeLimit);
        } else if ("accountPayment".equals(normalizedModuleKey)) {
            records = buildPaymentRecords(safeLimit);
        } else if ("accountMove".equals(normalizedModuleKey)) {
            records = buildMoveRecords(safeLimit);
        } else {
            records = List.of();
        }
        return buildCockpit(normalizedModuleKey, records);
    }

    public AccountFinancialTraceDetailDto getDetail(String moduleKey, Long id) {
        String normalizedModuleKey = moduleKey == null ? "" : moduleKey.trim();
        if ("accountInvoice".equals(normalizedModuleKey)) {
            return buildInvoiceDetail(id);
        }
        if ("accountPayment".equals(normalizedModuleKey)) {
            return buildPaymentDetail(id);
        }
        if ("accountMove".equals(normalizedModuleKey)) {
            return buildMoveDetail(id);
        }
        throw new RuntimeException("暂不支持该财务追溯模块: " + normalizedModuleKey);
    }

    private List<AccountFinancialTraceRecordDto> buildInvoiceRecords(int limit) {
        List<AccountInvoice> invoices = accountInvoiceMapper.selectList(
            new LambdaQueryWrapper<AccountInvoice>()
                .orderByDesc(AccountInvoice::getId)
                .last("LIMIT " + limit)
        );
        List<AccountFinancialTraceRecordDto> records = new ArrayList<>();
        for (AccountInvoice invoice : invoices) {
            EvidenceSummary evidence = loadEvidence("accountInvoice", invoice.getId());
            AccountFinancialTraceRecordDto record = new AccountFinancialTraceRecordDto();
            record.setId(invoice.getId());
            record.setRef(invoice.getName());
            record.setState(invoice.getState());
            record.setOriginRef(invoice.getOriginRef());
            record.setPaymentRef(invoice.getPaymentRef());
            record.setPaymentState(invoice.getPaymentState());
            record.setAmount(invoice.getAmountTotal());
            applyEvidence(record, evidence);
            classifyInvoice(record);
            records.add(record);
        }
        return records;
    }

    private List<AccountFinancialTraceRecordDto> buildPaymentRecords(int limit) {
        List<AccountPayment> payments = accountPaymentMapper.selectList(
            new LambdaQueryWrapper<AccountPayment>()
                .orderByDesc(AccountPayment::getId)
                .last("LIMIT " + limit)
        );
        List<AccountFinancialTraceRecordDto> records = new ArrayList<>();
        for (AccountPayment payment : payments) {
            EvidenceSummary evidence = loadEvidence("accountPayment", payment.getId());
            AccountFinancialTraceRecordDto record = new AccountFinancialTraceRecordDto();
            record.setId(payment.getId());
            record.setRef(payment.getName());
            record.setState(payment.getState());
            record.setOriginRef(payment.getOriginRef());
            record.setInvoiceRef(payment.getInvoiceRef());
            record.setJournalEntryRef(payment.getJournalEntryRef());
            record.setAmount(payment.getAmount());
            applyEvidence(record, evidence);
            classifyPayment(record);
            records.add(record);
        }
        return records;
    }

    private List<AccountFinancialTraceRecordDto> buildMoveRecords(int limit) {
        List<AccountMove> moves = accountMoveMapper.selectList(
            new LambdaQueryWrapper<AccountMove>()
                .orderByDesc(AccountMove::getId)
                .last("LIMIT " + limit)
        );
        List<AccountFinancialTraceRecordDto> records = new ArrayList<>();
        for (AccountMove move : moves) {
            EvidenceSummary evidence = loadEvidence("accountMove", move.getId());
            List<AccountMoveLine> lines = accountMoveLineMapper.selectList(
                new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, move.getId())
            );
            AccountFinancialTraceRecordDto record = new AccountFinancialTraceRecordDto();
            record.setId(move.getId());
            record.setRef(move.getName());
            record.setState(move.getState());
            record.setOriginRef(move.getRef());
            record.setReversedEntryRef(move.getReversedEntryRef());
            record.setReversedFromRef(move.getReversedFromRef());
            record.setAmount(move.getAmountTotal());
            record.setReconcileContext(resolveReconcileContext(move.getExtData()));
            record.setLineCount(lines.size());
            record.setMatchedLineCount(countLinesByState(lines, "matched"));
            record.setOpenLineCount(countOpenLines(lines));
            applyEvidence(record, evidence);
            classifyMove(record);
            records.add(record);
        }
        return records;
    }

    private AccountFinancialTraceDetailDto buildInvoiceDetail(Long id) {
        AccountInvoice invoice = accountInvoiceMapper.selectById(id);
        if (invoice == null) {
            throw new RuntimeException("发票追溯对象不存在");
        }
        AccountFinancialTraceRecordDto record = buildInvoiceRecord(invoice);
        List<AccountFinancialTraceLinkDto> relatedLinks = new ArrayList<>();
        appendOriginLink(relatedLinks, invoice.getOriginRef(), "origin");

        AccountPayment payment = null;
        if (!isBlank(invoice.getPaymentRef())) {
            payment = accountPaymentMapper.selectOne(
                new LambdaQueryWrapper<AccountPayment>()
                    .eq(AccountPayment::getName, invoice.getPaymentRef())
                    .last("LIMIT 1")
            );
            if (payment != null) {
                relatedLinks.add(buildLink("payment", "Payment", "accountPayment", payment.getId(), payment.getName()));
                appendJournalLink(relatedLinks, payment.getJournalEntryRef(), "journal");
            }
        }

        List<String> explanations = new ArrayList<>();
        explanations.add(isBlank(invoice.getOriginRef())
            ? "上游来源仍然缺失，当前发票无法解释自己来自哪条销售或采购链。"
            : "当前发票已经挂到上游业务来源，可继续追到原始销售或采购对象。");
        explanations.add(isBlank(invoice.getPaymentRef())
            ? "付款结果对象还没有闭合到这张发票上，后续结算仍需要人工追查。"
            : "付款结果对象已经挂接到发票，可继续沿支付链追到凭证。");
        explanations.add((record.getAttachmentCount() == null || record.getAttachmentCount() == 0) && (record.getNoteCount() == null || record.getNoteCount() == 0)
            ? "这张发票还缺少附件或说明性便签，试点放量前证据仍偏弱。"
            : "当前发票已经积累基础证据，适合继续做结算复核与交接。");

        List<String> settlementLines = new ArrayList<>();
        settlementLines.add("链路: 发票 -> 付款 -> 凭证");
        settlementLines.add("发票: " + safeText(invoice.getName()));
        settlementLines.add("付款: " + safeText(invoice.getPaymentRef()));
        settlementLines.add("付款状态: " + safeText(invoice.getPaymentState()));
        settlementLines.add("凭证: " + safeText(payment == null ? null : payment.getJournalEntryRef()));

        return buildDetail("accountInvoice", record, explanations, settlementLines, relatedLinks);
    }

    private AccountFinancialTraceDetailDto buildPaymentDetail(Long id) {
        AccountPayment payment = accountPaymentMapper.selectById(id);
        if (payment == null) {
            throw new RuntimeException("付款追溯对象不存在");
        }
        AccountFinancialTraceRecordDto record = buildPaymentRecord(payment);
        List<AccountFinancialTraceLinkDto> relatedLinks = new ArrayList<>();
        appendOriginLink(relatedLinks, payment.getOriginRef(), "origin");

        AccountInvoice invoice = null;
        if (!isBlank(payment.getInvoiceRef())) {
            invoice = accountInvoiceMapper.selectOne(
                new LambdaQueryWrapper<AccountInvoice>()
                    .eq(AccountInvoice::getName, payment.getInvoiceRef())
                    .last("LIMIT 1")
            );
            if (invoice != null) {
                relatedLinks.add(buildLink("invoice", "Invoice", "accountInvoice", invoice.getId(), invoice.getName()));
            }
        }
        appendJournalLink(relatedLinks, payment.getJournalEntryRef(), "journal");

        List<String> explanations = new ArrayList<>();
        explanations.add(isBlank(payment.getInvoiceRef())
            ? "这笔付款还没有绑定发票对象，结算解释会断在付款层。"
            : "这笔付款已经绑定发票对象，可从付款直接重开发票上下文。");
        explanations.add(isBlank(payment.getJournalEntryRef())
            ? "付款过账后仍缺凭证引用，财务侧无法直接审查结果对象。"
            : "付款过账已经生成凭证引用，财务侧可以继续核对总账结果。");
        explanations.add((record.getAttachmentCount() == null || record.getAttachmentCount() == 0) && (record.getNoteCount() == null || record.getNoteCount() == 0)
            ? "付款回单、汇款说明或结算备注仍未沉淀下来。"
            : "付款证据已经开始沉淀，后续回退和对账可直接复用。");

        List<String> settlementLines = new ArrayList<>();
        settlementLines.add("链路: 发票 -> 付款 -> 凭证");
        settlementLines.add("发票: " + safeText(payment.getInvoiceRef()));
        settlementLines.add("付款: " + safeText(payment.getName()));
        settlementLines.add("来源: " + safeText(payment.getOriginRef()));
        settlementLines.add("凭证: " + safeText(payment.getJournalEntryRef()));

        return buildDetail("accountPayment", record, explanations, settlementLines, relatedLinks);
    }

    private AccountFinancialTraceDetailDto buildMoveDetail(Long id) {
        AccountMove move = accountMoveMapper.selectById(id);
        if (move == null) {
            throw new RuntimeException("凭证追溯对象不存在");
        }
        AccountFinancialTraceRecordDto record = buildMoveRecord(move);
        List<AccountFinancialTraceLinkDto> relatedLinks = new ArrayList<>();

        AccountPayment payment = null;
        if (!isBlank(move.getName())) {
            payment = accountPaymentMapper.selectOne(
                new LambdaQueryWrapper<AccountPayment>()
                    .eq(AccountPayment::getJournalEntryRef, move.getName())
                    .last("LIMIT 1")
            );
        }
        if (payment == null && !isBlank(move.getRef())) {
            payment = accountPaymentMapper.selectOne(
                new LambdaQueryWrapper<AccountPayment>()
                    .eq(AccountPayment::getName, move.getRef())
                    .last("LIMIT 1")
            );
        }
        if (payment != null) {
            relatedLinks.add(buildLink("payment", "Payment", "accountPayment", payment.getId(), payment.getName()));
            if (!isBlank(payment.getInvoiceRef())) {
                AccountInvoice invoice = accountInvoiceMapper.selectOne(
                    new LambdaQueryWrapper<AccountInvoice>()
                        .eq(AccountInvoice::getName, payment.getInvoiceRef())
                        .last("LIMIT 1")
                );
                if (invoice != null) {
                    relatedLinks.add(buildLink("invoice", "Invoice", "accountInvoice", invoice.getId(), invoice.getName()));
                    appendOriginLink(relatedLinks, invoice.getOriginRef(), "origin");
                }
            } else {
                appendOriginLink(relatedLinks, payment.getOriginRef(), "origin");
            }
        } else {
            appendOriginLink(relatedLinks, move.getRef(), "origin");
        }
        appendReverseLink(relatedLinks, move.getReversedEntryRef(), "reversal");
        appendMoveOriginLink(relatedLinks, move.getReversedFromRef(), "source-move");

        List<String> explanations = new ArrayList<>();
        explanations.add(isBlank(record.getOriginRef()) && isBlank(record.getReversedFromRef())
            ? "当前凭证仍缺来源解释，无法直接说明它是由哪条业务链或哪次冲销产生。"
            : "当前凭证已经保留来源解释，可继续回查业务对象或原始凭证。");
        explanations.add(record.getOpenLineCount() != null && record.getOpenLineCount() > 0
            ? "凭证仍存在未清项，需要继续处理对账或补齐结算说明。"
            : "当前凭证没有开放未清项，结算结果相对更容易解释。");
        explanations.add(isBlank(record.getReconcileContext())
            ? "对账上下文仍为空，操作员可能需要重新判断匹配依据。"
            : "对账上下文已经写入，可帮助下一位操作员快速理解匹配依据。");

        List<String> settlementLines = new ArrayList<>();
        settlementLines.add("链路: 业务来源 -> 发票/付款 -> 凭证 -> 分录");
        settlementLines.add("凭证: " + safeText(move.getName()));
        settlementLines.add("来源: " + safeText(move.getRef()));
        settlementLines.add("冲销来源: " + safeText(move.getReversedFromRef()));
        settlementLines.add("未清项: " + record.getOpenLineCount() + "/" + record.getLineCount());
        settlementLines.add("对账上下文: " + safeText(record.getReconcileContext()));

        return buildDetail("accountMove", record, explanations, settlementLines, relatedLinks);
    }

    private AccountFinancialTraceRecordDto buildInvoiceRecord(AccountInvoice invoice) {
        EvidenceSummary evidence = loadEvidence("accountInvoice", invoice.getId());
        AccountFinancialTraceRecordDto record = new AccountFinancialTraceRecordDto();
        record.setId(invoice.getId());
        record.setRef(invoice.getName());
        record.setState(invoice.getState());
        record.setOriginRef(invoice.getOriginRef());
        record.setPaymentRef(invoice.getPaymentRef());
        record.setPaymentState(invoice.getPaymentState());
        record.setAmount(invoice.getAmountTotal());
        applyEvidence(record, evidence);
        classifyInvoice(record);
        return record;
    }

    private AccountFinancialTraceRecordDto buildPaymentRecord(AccountPayment payment) {
        EvidenceSummary evidence = loadEvidence("accountPayment", payment.getId());
        AccountFinancialTraceRecordDto record = new AccountFinancialTraceRecordDto();
        record.setId(payment.getId());
        record.setRef(payment.getName());
        record.setState(payment.getState());
        record.setOriginRef(payment.getOriginRef());
        record.setInvoiceRef(payment.getInvoiceRef());
        record.setJournalEntryRef(payment.getJournalEntryRef());
        record.setAmount(payment.getAmount());
        applyEvidence(record, evidence);
        classifyPayment(record);
        return record;
    }

    private AccountFinancialTraceRecordDto buildMoveRecord(AccountMove move) {
        EvidenceSummary evidence = loadEvidence("accountMove", move.getId());
        List<AccountMoveLine> lines = accountMoveLineMapper.selectList(
            new LambdaQueryWrapper<AccountMoveLine>().eq(AccountMoveLine::getMoveId, move.getId())
        );
        AccountFinancialTraceRecordDto record = new AccountFinancialTraceRecordDto();
        record.setId(move.getId());
        record.setRef(move.getName());
        record.setState(move.getState());
        record.setOriginRef(move.getRef());
        record.setReversedEntryRef(move.getReversedEntryRef());
        record.setReversedFromRef(move.getReversedFromRef());
        record.setAmount(move.getAmountTotal());
        record.setReconcileContext(resolveReconcileContext(move.getExtData()));
        record.setLineCount(lines.size());
        record.setMatchedLineCount(countLinesByState(lines, "matched"));
        record.setOpenLineCount(countOpenLines(lines));
        applyEvidence(record, evidence);
        classifyMove(record);
        return record;
    }

    private void classifyInvoice(AccountFinancialTraceRecordDto record) {
        List<String> warningKeys = new ArrayList<>();
        List<String> missingKeys = new ArrayList<>();
        if (isBlank(record.getOriginRef())) {
            missingKeys.add("origin-ref");
        }
        if ("posted".equals(record.getState())) {
            if (isBlank(record.getPaymentRef())) {
                missingKeys.add("payment-linkage");
            } else if (!"paid".equals(record.getPaymentState())) {
                warningKeys.add("payment-state-open");
            }
        } else if (!isBlank(record.getPaymentRef()) && !"paid".equals(record.getPaymentState())) {
            warningKeys.add("payment-state-open");
        }
        if ((record.getAttachmentCount() == null || record.getAttachmentCount() == 0)
            && (record.getNoteCount() == null || record.getNoteCount() == 0)) {
            warningKeys.add("billing-evidence");
        }
        applyStatus(record, warningKeys, missingKeys);
    }

    private void classifyPayment(AccountFinancialTraceRecordDto record) {
        List<String> warningKeys = new ArrayList<>();
        List<String> missingKeys = new ArrayList<>();
        if (isBlank(record.getInvoiceRef())) {
            missingKeys.add("invoice-ref");
        }
        if (isBlank(record.getOriginRef()) && isBlank(record.getInvoiceRef())) {
            missingKeys.add("source-anchor");
        } else if (isBlank(record.getOriginRef())) {
            warningKeys.add("source-anchor");
        }
        if ("posted".equals(record.getState()) && isBlank(record.getJournalEntryRef())) {
            missingKeys.add("journal-entry");
        }
        if ((record.getAttachmentCount() == null || record.getAttachmentCount() == 0)
            && (record.getNoteCount() == null || record.getNoteCount() == 0)) {
            warningKeys.add("payment-proof");
        }
        if (!"posted".equals(record.getState())) {
            warningKeys.add("posting-pending");
        }
        applyStatus(record, warningKeys, missingKeys);
    }

    private void classifyMove(AccountFinancialTraceRecordDto record) {
        List<String> warningKeys = new ArrayList<>();
        List<String> missingKeys = new ArrayList<>();
        if (isBlank(record.getOriginRef()) && isBlank(record.getReversedFromRef())) {
            missingKeys.add("source-explanation");
        }
        if (record.getLineCount() == null || record.getLineCount() == 0) {
            missingKeys.add("journal-lines");
        }
        if ("posted".equals(record.getState()) && (record.getOpenLineCount() != null && record.getOpenLineCount() > 0)) {
            warningKeys.add("reconcile-open-items");
            if (isBlank(record.getReconcileContext())) {
                warningKeys.add("reconcile-context");
            }
        }
        if ((record.getAttachmentCount() == null || record.getAttachmentCount() == 0)
            && (record.getNoteCount() == null || record.getNoteCount() == 0)) {
            warningKeys.add("journal-evidence");
        }
        applyStatus(record, warningKeys, missingKeys);
    }

    private void applyStatus(
        AccountFinancialTraceRecordDto record,
        List<String> warningKeys,
        List<String> missingKeys
    ) {
        record.setWarningKeys(warningKeys);
        record.setMissingKeys(missingKeys);
        if (!missingKeys.isEmpty()) {
            record.setStatus("missing");
            return;
        }
        if (!warningKeys.isEmpty()) {
            record.setStatus("warning");
            return;
        }
        record.setStatus("ready");
    }

    private AccountFinancialTraceCockpitDto buildCockpit(
        String moduleKey,
        List<AccountFinancialTraceRecordDto> records
    ) {
        int readyCount = 0;
        int warningCount = 0;
        int missingCount = 0;
        int evidenceReadyCount = 0;
        int noteCount = 0;
        int attachmentCount = 0;
        int logCount = 0;
        Set<String> warningKeys = new LinkedHashSet<>();
        Set<String> missingKeys = new LinkedHashSet<>();
        for (AccountFinancialTraceRecordDto record : records) {
            if ("missing".equals(record.getStatus())) {
                missingCount += 1;
            } else if ("warning".equals(record.getStatus())) {
                warningCount += 1;
            } else {
                readyCount += 1;
            }
            if ((record.getAttachmentCount() != null && record.getAttachmentCount() > 0)
                || (record.getNoteCount() != null && record.getNoteCount() > 0)) {
                evidenceReadyCount += 1;
            }
            noteCount += defaultInt(record.getNoteCount());
            attachmentCount += defaultInt(record.getAttachmentCount());
            logCount += defaultInt(record.getLogCount());
            if (record.getWarningKeys() != null) {
                warningKeys.addAll(record.getWarningKeys());
            }
            if (record.getMissingKeys() != null) {
                missingKeys.addAll(record.getMissingKeys());
            }
        }
        AccountFinancialTraceCockpitDto cockpit = new AccountFinancialTraceCockpitDto();
        cockpit.setModuleKey(moduleKey);
        cockpit.setRecordCount(records.size());
        cockpit.setReadyCount(readyCount);
        cockpit.setWarningCount(warningCount);
        cockpit.setMissingCount(missingCount);
        cockpit.setEvidenceReadyCount(evidenceReadyCount);
        cockpit.setNoteCount(noteCount);
        cockpit.setAttachmentCount(attachmentCount);
        cockpit.setLogCount(logCount);
        cockpit.setWarningKeys(new ArrayList<>(warningKeys));
        cockpit.setMissingKeys(new ArrayList<>(missingKeys));
        cockpit.setRecords(records);
        return cockpit;
    }

    private void applyEvidence(AccountFinancialTraceRecordDto record, EvidenceSummary evidence) {
        record.setNoteCount(evidence.noteCount());
        record.setAttachmentCount(evidence.attachmentCount());
        record.setLogCount(evidence.logCount());
    }

    private EvidenceSummary loadEvidence(String moduleKey, Long id) {
        // 与 Timeline 使用同一套模型名解析，保证日志/便签/附件统计口径一致。
        List<String> modelNames = resolveModelNames(moduleKey);
        Integer resId = id == null ? null : id.intValue();
        if (resId == null || modelNames.isEmpty()) {
            return new EvidenceSummary(0, 0, 0);
        }
        int noteCount = Math.toIntExact(
            irNoteMapper.selectCount(
                new LambdaQueryWrapper<IrNote>()
                    .in(IrNote::getResModel, modelNames)
                    .eq(IrNote::getResId, resId)
            )
        );
        int attachmentCount = Math.toIntExact(
            irAttachmentMapper.selectCount(
                new LambdaQueryWrapper<IrAttachment>()
                    .in(IrAttachment::getResModel, modelNames)
                    .eq(IrAttachment::getResId, id)
            )
        );
        int logCount = Math.toIntExact(
            irLoggingMapper.selectCount(
                new LambdaQueryWrapper<IrLogging>()
                    .in(IrLogging::getResModel, modelNames)
                    .eq(IrLogging::getResId, resId)
            )
        );
        return new EvidenceSummary(noteCount, attachmentCount, logCount);
    }

    private String resolveReconcileContext(Map<String, Object> extData) {
        if (extData == null) {
            return null;
        }
        Object value = extData.get("reconcileContext");
        return value == null ? null : String.valueOf(value);
    }

    private int countLinesByState(List<AccountMoveLine> lines, String state) {
        int count = 0;
        for (AccountMoveLine line : lines) {
            if (state.equals(line.getReconciled())) {
                count += 1;
            }
        }
        return count;
    }

    private int countOpenLines(List<AccountMoveLine> lines) {
        int count = 0;
        for (AccountMoveLine line : lines) {
            String reconciled = line.getReconciled();
            if (reconciled == null || reconciled.isBlank() || "open".equals(reconciled)) {
                count += 1;
            }
        }
        return count;
    }

    private List<String> resolveModelNames(String moduleKey) {
        if (moduleKey == null || moduleKey.isBlank()) {
            return List.of();
        }
        String trimmed = moduleKey.trim();
        Set<String> names = new LinkedHashSet<>();
        names.add(Character.toUpperCase(trimmed.charAt(0)) + trimmed.substring(1));
        names.add(Character.toLowerCase(trimmed.charAt(0)) + trimmed.substring(1));
        return new ArrayList<>(names);
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 8;
        }
        return Math.max(1, Math.min(limit, 24));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private int defaultInt(Integer value) {
        return value == null ? 0 : value;
    }

    private AccountFinancialTraceDetailDto buildDetail(
        String moduleKey,
        AccountFinancialTraceRecordDto record,
        List<String> explanations,
        List<String> settlementLines,
        List<AccountFinancialTraceLinkDto> relatedLinks
    ) {
        AccountFinancialTraceDetailDto detail = new AccountFinancialTraceDetailDto();
        detail.setModuleKey(moduleKey);
        detail.setRecord(record);
        detail.setExplanationLines(explanations);
        detail.setSettlementLines(settlementLines);
        detail.setRelatedLinks(deduplicateLinks(relatedLinks));
        return detail;
    }

    private void appendOriginLink(List<AccountFinancialTraceLinkDto> links, String originRef, String relationType) {
        if (isBlank(originRef)) {
            return;
        }
        SaleOrder saleOrder = saleOrderMapper.selectOne(
            new LambdaQueryWrapper<SaleOrder>().eq(SaleOrder::getName, originRef).last("LIMIT 1")
        );
        if (saleOrder != null) {
            links.add(buildLink(relationType, "Sale Order", "saleOrder", saleOrder.getId(), saleOrder.getName()));
            return;
        }
        PurchaseOrder purchaseOrder = purchaseOrderMapper.selectOne(
            new LambdaQueryWrapper<PurchaseOrder>().eq(PurchaseOrder::getName, originRef).last("LIMIT 1")
        );
        if (purchaseOrder != null) {
            links.add(buildLink(relationType, "Purchase Order", "purchaseOrder", purchaseOrder.getId(), purchaseOrder.getName()));
        }
    }

    private void appendJournalLink(List<AccountFinancialTraceLinkDto> links, String moveRef, String relationType) {
        if (isBlank(moveRef)) {
            return;
        }
        AccountMove move = accountMoveMapper.selectOne(
            new LambdaQueryWrapper<AccountMove>().eq(AccountMove::getName, moveRef).last("LIMIT 1")
        );
        if (move != null) {
            links.add(buildLink(relationType, "Journal Entry", "accountMove", move.getId(), move.getName()));
        }
    }

    private void appendReverseLink(List<AccountFinancialTraceLinkDto> links, String moveRef, String relationType) {
        appendJournalLink(links, moveRef, relationType);
    }

    private void appendMoveOriginLink(List<AccountFinancialTraceLinkDto> links, String moveRef, String relationType) {
        appendJournalLink(links, moveRef, relationType);
    }

    private AccountFinancialTraceLinkDto buildLink(
        String relationType,
        String label,
        String moduleKey,
        Long recordId,
        String ref
    ) {
        AccountFinancialTraceLinkDto link = new AccountFinancialTraceLinkDto();
        link.setRelationType(relationType);
        link.setLabel(label);
        link.setModuleKey(moduleKey);
        link.setRecordId(recordId);
        link.setRef(ref);
        return link;
    }

    private List<AccountFinancialTraceLinkDto> deduplicateLinks(List<AccountFinancialTraceLinkDto> links) {
        List<AccountFinancialTraceLinkDto> result = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (AccountFinancialTraceLinkDto link : links) {
            if (link == null || link.getRecordId() == null || isBlank(link.getModuleKey())) {
                continue;
            }
            String key = link.getModuleKey() + ":" + link.getRecordId() + ":" + safeText(link.getRelationType());
            if (seen.add(key)) {
                result.add(link);
            }
        }
        return result;
    }

    private String safeText(String value) {
        return isBlank(value) ? "-" : value;
    }

    private record EvidenceSummary(int noteCount, int attachmentCount, int logCount) {}
}
