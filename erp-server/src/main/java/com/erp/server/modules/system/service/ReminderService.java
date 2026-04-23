package com.erp.server.modules.system.service;

import com.erp.server.modules.system.dto.ReminderItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReminderService {

    private static final int IDLE_PARTNER_DAYS = 30;

    private final JdbcTemplate jdbcTemplate;

    public List<ReminderItemDto> listReminders(Integer limit, String moduleKey, Long recordId) {
        int size = limit == null || limit < 1 ? 20 : Math.min(limit, 50);
        List<ReminderItemDto> reminders = new ArrayList<>();
        // Keep the reminder feed scoped to first-wave issues that directly
        // improve cutover visibility: context gaps, evidence gaps, and overdue cash collection.
        if (inModuleScope(moduleKey, "resPartner")) {
            reminders.addAll(loadIdlePartnerReminders(size));
            reminders.addAll(loadPartnerContextGapReminders(size));
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "resPartner",
                "res_partner",
                "name",
                "COALESCE(t.active, TRUE) = TRUE",
                "Partner evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("contract", "CONTRACT", "Contract"),
                    new EvidenceRequirement("certificate", "CERTIFICATE", "Certificate")
                )
            ));
        }
        if (inModuleScope(moduleKey, "resCompany")) {
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "resCompany",
                "res_company",
                "name",
                "COALESCE(t.active, TRUE) = TRUE",
                "Company evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("legal_doc", "LEGAL_DOC", "Legal Document"),
                    new EvidenceRequirement("tax_doc", "TAX_DOC", "Tax Document")
                )
            ));
        }
        if (inModuleScope(moduleKey, "productTemplate")) {
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "productTemplate",
                "product_template",
                "name",
                "COALESCE(t.active, TRUE) = TRUE",
                "Product template evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("spec", "SPEC", "Specification"),
                    new EvidenceRequirement("costing", "COSTING", "Costing Basis")
                )
            ));
        }
        if (inModuleScope(moduleKey, "productProduct")) {
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "productProduct",
                "product_product",
                "default_code",
                "COALESCE(t.active, TRUE) = TRUE",
                "Product variant evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("barcode_label", "BARCODE_LABEL", "Barcode Label"),
                    new EvidenceRequirement("variant_approval", "VARIANT_APPROVAL", "Variant Approval")
                )
            ));
        }
        if (inModuleScope(moduleKey, "productCategory")) {
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "productCategory",
                "product_category",
                "name",
                "t.name IS NOT NULL",
                "Product category evidence incomplete",
                "info",
                List.of(
                    new EvidenceRequirement("category_policy", "CATEGORY_POLICY", "Category Policy")
                )
            ));
        }
        if (inModuleScope(moduleKey, "productPricelist")) {
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "productPricelist",
                "product_pricelist",
                "name",
                "COALESCE(t.active, TRUE) = TRUE",
                "Pricelist evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("price_approval", "PRICE_APPROVAL", "Price Approval"),
                    new EvidenceRequirement("effective_policy", "EFFECTIVE_POLICY", "Effective Policy")
                )
            ));
        }
        if (inModuleScope(moduleKey, "saleOrder")) {
            reminders.addAll(loadTimelineContextGapReminders(
                size,
                "saleOrder",
                "sale_order",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Sales timeline context missing",
                "Sales order [%s] has no timeline note yet. Add quote, delivery, or billing handoff context before downstream work expands."
            ));
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "saleOrder",
                "sale_order",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Sales evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("contract", "CONTRACT", "Contract"),
                    new EvidenceRequirement("quotation", "QUOTATION", "Quotation"),
                    new EvidenceRequirement("delivery", "DELIVERY", "Delivery Slip")
                )
            ));
        }
        if (inModuleScope(moduleKey, "purchaseOrder")) {
            reminders.addAll(loadTimelineContextGapReminders(
                size,
                "purchaseOrder",
                "purchase_order",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Purchase timeline context missing",
                "Purchase order [%s] has no timeline note yet. Add vendor, receipt, or bill handoff context before procurement cutover expands."
            ));
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "purchaseOrder",
                "purchase_order",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Purchase evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("contract", "CONTRACT", "Contract"),
                    new EvidenceRequirement("vendor_quote", "VENDOR_QUOTE", "Vendor Quote"),
                    new EvidenceRequirement("bill", "BILL", "Vendor Bill")
                )
            ));
        }
        if (inModuleScope(moduleKey, "stockPicking")) {
            reminders.addAll(loadTimelineContextGapReminders(
                size,
                "stockPicking",
                "stock_picking",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Transfer timeline context missing",
                "Transfer [%s] has no timeline note yet. Add routing, packing, receipt, or quality context before validation pressure increases."
            ));
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "stockPicking",
                "stock_picking",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Transfer evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("contract", "CONTRACT", "Contract"),
                    new EvidenceRequirement("packing_list", "PACKING_LIST", "Packing List")
                )
            ));
        }
        if (inModuleScope(moduleKey, "accountInvoice")) {
            reminders.addAll(loadOverdueInvoiceReminders(size));
            reminders.addAll(loadTimelineContextGapReminders(
                size,
                "accountInvoice",
                "account_invoice",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Invoice timeline context missing",
                "Invoice [%s] has no timeline note yet. Add posting, settlement, or reversal context before payment follow-up continues."
            ));
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "accountInvoice",
                "account_invoice",
                "name",
                "COALESCE(t.state, 'draft') NOT IN ('draft', 'cancel')",
                "Invoice evidence incomplete",
                "warning",
                List.of(
                    new EvidenceRequirement("contract", "CONTRACT", "Contract"),
                    new EvidenceRequirement("invoice_pdf", "INVOICE_PDF", "Invoice PDF")
                )
            ));
        }
        if (inModuleScope(moduleKey, "accountPayment")) {
            reminders.addAll(loadTimelineContextGapReminders(
                size,
                "accountPayment",
                "account_payment",
                "name",
                "COALESCE(t.state, 'draft') <> 'cancel'",
                "Payment timeline context missing",
                "Payment [%s] has no timeline note yet. Add settlement, bank proof, or journal handoff context before finance review continues."
            ));
            reminders.addAll(loadEvidenceGapReminders(
                size,
                "accountPayment",
                "account_payment",
                "name",
                "COALESCE(t.state, 'draft') <> 'cancel'",
                "Payment evidence incomplete",
                "critical",
                List.of(
                    new EvidenceRequirement("contract", "CONTRACT", "Contract"),
                    new EvidenceRequirement("payment_proof", "PAYMENT_PROOF", "Payment Proof")
                )
            ));
        }
        reminders.addAll(loadRoleTaskOverdueReminders(size, moduleKey));
        reminders.addAll(loadRoleTaskDueSoonReminders(size, moduleKey));
        reminders.addAll(loadCloseTaskBlockedReminders(size, moduleKey));
        reminders.addAll(loadCloseTaskStaleReminders(size, moduleKey));

        if (moduleKey != null && !moduleKey.isBlank()) {
            reminders = reminders.stream()
                .filter(item -> moduleKey.equals(item.getModuleKey()))
                .collect(Collectors.toCollection(ArrayList::new));
        }
        if (recordId != null) {
            reminders = reminders.stream()
                .filter(item -> recordId.equals(item.getRecordId()))
                .collect(Collectors.toCollection(ArrayList::new));
        }
        reminders.sort(
            Comparator.comparing(ReminderItemDto::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(item -> severityRank(item.getSeverity()), Comparator.reverseOrder())
        );
        return reminders.size() > size ? reminders.subList(0, size) : reminders;
    }

    private boolean inModuleScope(String requestedModuleKey, String targetModuleKey) {
        return requestedModuleKey == null || requestedModuleKey.isBlank() || targetModuleKey.equals(requestedModuleKey);
    }

    private List<ReminderItemDto> loadIdlePartnerReminders(int limit) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(IDLE_PARTNER_DAYS);
        String sql = """
            SELECT
                p.id,
                p.name,
                GREATEST(
                    COALESCE(logs.last_activity, TIMESTAMP '1970-01-01 00:00:00'),
                    COALESCE(notes.last_activity, TIMESTAMP '1970-01-01 00:00:00'),
                    COALESCE(attachments.last_activity, TIMESTAMP '1970-01-01 00:00:00')
                ) AS last_activity
            FROM res_partner p
            LEFT JOIN (
                SELECT res_id, MAX(create_date) AS last_activity
                FROM ir_logging
                WHERE res_model IN ('ResPartner', 'resPartner')
                GROUP BY res_id
            ) logs ON logs.res_id = p.id
            LEFT JOIN (
                SELECT res_id, MAX(create_date) AS last_activity
                FROM ir_note
                WHERE res_model IN ('ResPartner', 'resPartner')
                GROUP BY res_id
            ) notes ON notes.res_id = p.id
            LEFT JOIN (
                SELECT res_id, MAX(create_date) AS last_activity
                FROM ir_attachment
                WHERE res_model IN ('ResPartner', 'resPartner')
                GROUP BY res_id
            ) attachments ON attachments.res_id = p.id
            WHERE COALESCE(p.active, TRUE) = TRUE
            ORDER BY last_activity ASC NULLS FIRST, p.id DESC
            LIMIT ?
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> mapIdlePartnerReminder(rs, cutoff), limit)
            .stream()
            .filter(item -> item != null)
            .toList();
    }

    private ReminderItemDto mapIdlePartnerReminder(ResultSet rs, LocalDateTime cutoff) throws SQLException {
        Long partnerId = rs.getLong("id");
        String partnerName = rs.getString("name");
        LocalDateTime lastActivity = toLocalDateTime(rs.getTimestamp("last_activity"));
        if (lastActivity != null && !lastActivity.isBefore(cutoff)) {
            return null;
        }

        long idleDays = lastActivity == null ? IDLE_PARTNER_DAYS : ChronoUnit.DAYS.between(lastActivity.toLocalDate(), LocalDate.now());
        String title = "Idle partner follow-up";
        String content = lastActivity == null
            ? String.format("Partner [%s] has no timeline activity yet. Start relationship context before pilot usage expands.", partnerName)
            : String.format("Partner [%s] has been idle for %d days. Reconnect before sales and purchase chains drift apart.", partnerName, Math.max(idleDays, IDLE_PARTNER_DAYS));
        LocalDateTime reminderTime = lastActivity == null ? cutoff : lastActivity;

        return new ReminderItemDto(
            "idle_partner:" + partnerId,
            "idle_partner",
            lastActivity == null || idleDays >= 45 ? "warning" : "info",
            title,
            content,
            "resPartner",
            partnerId,
            partnerName,
            reminderTime
        );
    }

    private List<ReminderItemDto> loadPartnerContextGapReminders(int limit) {
        String sql = """
            SELECT
                p.id,
                p.name,
                CURRENT_TIMESTAMP AS reminder_time
            FROM res_partner p
            LEFT JOIN (
                SELECT res_id, COUNT(*) AS note_count
                FROM ir_note
                WHERE res_model IN ('ResPartner', 'resPartner')
                GROUP BY res_id
            ) notes ON notes.res_id = p.id
            LEFT JOIN (
                SELECT res_id, COUNT(*) AS attachment_count
                FROM ir_attachment
                WHERE res_model IN ('ResPartner', 'resPartner')
                GROUP BY res_id
            ) attachments ON attachments.res_id = p.id
            WHERE COALESCE(p.active, TRUE) = TRUE
              AND COALESCE(notes.note_count, 0) = 0
              AND COALESCE(attachments.attachment_count, 0) = 0
            ORDER BY p.id DESC
            LIMIT ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new ReminderItemDto(
            "partner_context_gap:" + rs.getLong("id"),
            "partner_context_gap",
            "warning",
            "Partner context missing",
            String.format(
                "Partner [%s] still has no note or attachment context. Add Monica-style relationship history before downstream chains expand.",
                rs.getString("name")
            ),
            "resPartner",
            rs.getLong("id"),
            rs.getString("name"),
            toLocalDateTime(rs.getTimestamp("reminder_time"))
        ), limit);
    }

    private List<ReminderItemDto> loadTimelineContextGapReminders(
        int limit,
        String moduleKey,
        String tableName,
        String refColumn,
        String whereClause,
        String title,
        String contentTemplate
    ) {
        String sql = """
            SELECT
                t.id,
                COALESCE(t.%s, CAST(t.id AS TEXT)) AS ref_name,
                CURRENT_TIMESTAMP AS reminder_time,
                COALESCE(notes.note_count, 0) AS note_count
            FROM %s t
            LEFT JOIN (
                SELECT res_id, COUNT(*) AS note_count
                FROM ir_note
                WHERE res_model IN (%s)
                GROUP BY res_id
            ) notes ON notes.res_id = t.id
            WHERE %s
              AND COALESCE(notes.note_count, 0) = 0
            ORDER BY t.id DESC
            LIMIT ?
            """.formatted(
            refColumn,
            tableName,
            quoteSqlStrings(resolveModelNames(moduleKey)),
            whereClause
        );
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Long recordId = rs.getLong("id");
            String refName = rs.getString("ref_name");
            return new ReminderItemDto(
                moduleKey + "_context_gap:" + recordId,
                moduleKey + "_context_gap",
                "warning",
                title,
                String.format(contentTemplate, refName),
                moduleKey,
                recordId,
                refName,
                toLocalDateTime(rs.getTimestamp("reminder_time"))
            );
        }, limit);
    }

    private List<ReminderItemDto> loadOverdueInvoiceReminders(int limit) {
        String sql = """
            SELECT
                id,
                name,
                origin_ref,
                due_date,
                state,
                payment_state,
                COALESCE(write_date, create_date, due_date::timestamp) AS reminder_time
            FROM account_invoice
            WHERE state <> 'cancel'
              AND COALESCE(payment_state, 'not_paid') <> 'paid'
              AND due_date IS NOT NULL
              AND due_date < CURRENT_DATE
            ORDER BY due_date ASC, id DESC
            LIMIT ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapInvoiceReminder(rs), limit);
    }

    private ReminderItemDto mapInvoiceReminder(ResultSet rs) throws SQLException {
        Long invoiceId = rs.getLong("id");
        String invoiceName = rs.getString("name");
        String originRef = rs.getString("origin_ref");
        LocalDate dueDate = rs.getObject("due_date", LocalDate.class);
        long overdueDays = dueDate == null ? 0 : ChronoUnit.DAYS.between(dueDate, LocalDate.now());
        String severity = overdueDays >= 7 ? "critical" : "warning";
        String title = overdueDays >= 7 ? "Overdue invoice requires action" : "Invoice due follow-up";
        String content = String.format(
            "Invoice [%s] is overdue by %d days and still unpaid.%s",
            invoiceName,
            Math.max(overdueDays, 1),
            originRef == null || originRef.isBlank() ? "" : " Source: " + originRef
        );

        return new ReminderItemDto(
            "overdue_invoice:" + invoiceId,
            "overdue_invoice",
            severity,
            title,
            content,
            "accountInvoice",
            invoiceId,
            originRef == null || originRef.isBlank() ? invoiceName : originRef,
            toLocalDateTime(rs.getTimestamp("reminder_time"))
        );
    }

    private List<ReminderItemDto> loadEvidenceGapReminders(
        int limit,
        String moduleKey,
        String tableName,
        String refColumn,
        String whereClause,
        String title,
        String severity,
        List<EvidenceRequirement> requirements
    ) {
        String evidenceSelect = requirements.stream()
            .map(requirement -> "COUNT(a.id) FILTER (WHERE a.name ILIKE '[%s] %%') AS %s_count".formatted(
                requirement.prefix(),
                requirement.alias()
            ))
            .collect(Collectors.joining(",\n                "));
        String sql = """
            SELECT
                t.id,
                COALESCE(t.%s, CAST(t.id AS TEXT)) AS ref_name,
                CURRENT_TIMESTAMP AS reminder_time,
                %s
            FROM %s t
            LEFT JOIN ir_attachment a
                ON a.res_id = t.id
               AND a.res_model IN (%s)
            WHERE %s
            GROUP BY t.id, t.%s
            ORDER BY t.id DESC
            LIMIT ?
            """.formatted(
            refColumn,
            evidenceSelect,
            tableName,
            quoteSqlStrings(resolveModelNames(moduleKey)),
            whereClause,
            refColumn
        );
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapEvidenceGapReminder(rs, moduleKey, title, severity, requirements), limit)
            .stream()
            .filter(item -> item != null)
            .toList();
    }

    private ReminderItemDto mapEvidenceGapReminder(
        ResultSet rs,
        String moduleKey,
        String title,
        String severity,
        List<EvidenceRequirement> requirements
    ) throws SQLException {
        List<String> missingLabels = new ArrayList<>();
        for (EvidenceRequirement requirement : requirements) {
            if (rs.getInt(requirement.alias() + "_count") < 1) {
                missingLabels.add(requirement.label());
            }
        }
        if (missingLabels.isEmpty()) {
            return null;
        }
        Long recordId = rs.getLong("id");
        String refName = rs.getString("ref_name");
        return new ReminderItemDto(
            moduleKey + "_evidence_gap:" + recordId,
            moduleKey + "_evidence_gap",
            severity,
            title,
            buildEvidenceGapContent(moduleKey, refName, missingLabels),
            moduleKey,
            recordId,
            refName,
            toLocalDateTime(rs.getTimestamp("reminder_time"))
        );
    }

    private String buildEvidenceGapContent(String moduleKey, String refName, List<String> missingLabels) {
        String missing = String.join(", ", missingLabels);
        if ("resPartner".equals(moduleKey)) {
            return String.format(
                "Partner [%s] is missing required evidence: %s. Upload the relationship and qualification package before pilot expansion.",
                refName,
                missing
            );
        }
        if ("saleOrder".equals(moduleKey)) {
            return String.format(
                "Sales order [%s] is missing required evidence: %s. Complete the commercial and delivery package before downstream handoff.",
                refName,
                missing
            );
        }
        if ("purchaseOrder".equals(moduleKey)) {
            return String.format(
                "Purchase order [%s] is missing required evidence: %s. Complete the sourcing and payable package before cutover expands.",
                refName,
                missing
            );
        }
        if ("resCompany".equals(moduleKey)) {
            return String.format(
                "Company [%s] is missing required evidence: %s. Keep legal and tax proof visible before ownership cutover expands.",
                refName,
                missing
            );
        }
        if ("productTemplate".equals(moduleKey)) {
            return String.format(
                "Product template [%s] is missing required evidence: %s. Attach specs and costing basis before sales or purchase usage grows.",
                refName,
                missing
            );
        }
        if ("productProduct".equals(moduleKey)) {
            return String.format(
                "Product variant [%s] is missing required evidence: %s. Attach variant approval and barcode proof before order lines expand.",
                refName,
                missing
            );
        }
        if ("productCategory".equals(moduleKey)) {
            return String.format(
                "Product category [%s] is missing required evidence: %s. Keep classification rules visible for later product cleanup.",
                refName,
                missing
            );
        }
        if ("productPricelist".equals(moduleKey)) {
            return String.format(
                "Pricelist [%s] is missing required evidence: %s. Attach approval and effective policy before pricing cutover expands.",
                refName,
                missing
            );
        }
        if ("stockPicking".equals(moduleKey)) {
            return String.format(
                "Transfer [%s] is missing required evidence: %s. Keep packing and receipt proof with the stock record.",
                refName,
                missing
            );
        }
        if ("accountPayment".equals(moduleKey)) {
            return String.format(
                "Payment [%s] is missing required evidence: %s. Settlement proof should be attached before finance follow-up continues.",
                refName,
                missing
            );
        }
        return String.format(
            "Invoice [%s] is missing required evidence: %s. Complete the billing package before settlement review continues.",
            refName,
            missing
        );
    }

    private List<ReminderItemDto> loadRoleTaskOverdueReminders(int limit, String requestedModuleKey) {
        String sql = """
            SELECT *
            FROM (
                SELECT
                    task_id,
                    scope_key AS module_key,
                    scope_label,
                    role_label,
                    owner_name,
                    assignee_name,
                    status,
                    due_at,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY scope_type, scope_key, role_key
                        ORDER BY created_at DESC
                    ) AS rn
                FROM sys_cutover_role_task
                WHERE scope_type = 'module'
                  AND due_at IS NOT NULL
            ) latest
            WHERE rn = 1
              AND status <> 'done'
              AND due_at < CURRENT_TIMESTAMP
              AND (? IS NULL OR module_key = ?)
            ORDER BY due_at ASC, created_at DESC
            LIMIT ?
            """;
        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> mapRoleTaskReminder(rs, "role_task_overdue"),
            normalizeModuleScope(requestedModuleKey),
            normalizeModuleScope(requestedModuleKey),
            limit
        );
    }

    private List<ReminderItemDto> loadRoleTaskDueSoonReminders(int limit, String requestedModuleKey) {
        String sql = """
            SELECT *
            FROM (
                SELECT
                    task_id,
                    scope_key AS module_key,
                    scope_label,
                    role_label,
                    owner_name,
                    assignee_name,
                    status,
                    due_at,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY scope_type, scope_key, role_key
                        ORDER BY created_at DESC
                    ) AS rn
                FROM sys_cutover_role_task
                WHERE scope_type = 'module'
                  AND due_at IS NOT NULL
            ) latest
            WHERE rn = 1
              AND status <> 'done'
              AND due_at >= CURRENT_TIMESTAMP
              AND due_at <= CURRENT_TIMESTAMP + INTERVAL '6 hour'
              AND (? IS NULL OR module_key = ?)
            ORDER BY due_at ASC, created_at DESC
            LIMIT ?
            """;
        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> mapRoleTaskReminder(rs, "role_task_due_soon"),
            normalizeModuleScope(requestedModuleKey),
            normalizeModuleScope(requestedModuleKey),
            limit
        );
    }

    private ReminderItemDto mapRoleTaskReminder(ResultSet rs, String type) throws SQLException {
        String taskId = rs.getString("task_id");
        String moduleKey = rs.getString("module_key");
        String scopeLabel = rs.getString("scope_label");
        String roleLabel = rs.getString("role_label");
        String ownerName = rs.getString("owner_name");
        String assigneeName = rs.getString("assignee_name");
        LocalDateTime dueAt = toLocalDateTime(rs.getTimestamp("due_at"));
        LocalDateTime createdAt = toLocalDateTime(rs.getTimestamp("created_at"));
        LocalDateTime reminderTime = dueAt != null ? dueAt : createdAt;
        String assignee = assigneeName == null || assigneeName.isBlank() ? ownerName : assigneeName;
        boolean overdue = "role_task_overdue".equals(type);
        long hours = dueAt == null ? 0 : Math.abs(ChronoUnit.HOURS.between(LocalDateTime.now(), dueAt));
        String title = overdue ? "Role desk task overdue" : "Role desk task due soon";
        String content = overdue
            ? String.format(
                "Role desk task [%s · %s] assigned to [%s] is overdue by %d hours. Clear the owner handoff before pilot governance drifts.",
                scopeLabel,
                roleLabel,
                assignee,
                Math.max(hours, 1)
            )
            : String.format(
                "Role desk task [%s · %s] assigned to [%s] is due within %d hours. Close the SLA window before governance pressure turns into a blocker.",
                scopeLabel,
                roleLabel,
                assignee,
                Math.max(hours, 1)
            );
        return new ReminderItemDto(
            type + ":" + taskId,
            type,
            overdue ? "critical" : "warning",
            title,
            content,
            moduleKey,
            null,
            scopeLabel,
            reminderTime
        );
    }

    private List<ReminderItemDto> loadCloseTaskBlockedReminders(int limit, String requestedModuleKey) {
        String sql = """
            SELECT *
            FROM (
                SELECT
                    task_id,
                    module_key,
                    scope_label,
                    task_label,
                    status,
                    note,
                    updated_by,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY scope_type, scope_key, module_key, task_type
                        ORDER BY created_at DESC
                    ) AS rn
                FROM sys_cutover_close_task
                WHERE scope_type = 'module'
            ) latest
            WHERE rn = 1
              AND status = 'blocked'
              AND (? IS NULL OR module_key = ?)
            ORDER BY created_at DESC
            LIMIT ?
            """;
        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> mapCloseTaskReminder(rs, "close_task_blocked"),
            normalizeModuleScope(requestedModuleKey),
            normalizeModuleScope(requestedModuleKey),
            limit
        );
    }

    private List<ReminderItemDto> loadCloseTaskStaleReminders(int limit, String requestedModuleKey) {
        String sql = """
            SELECT *
            FROM (
                SELECT
                    task_id,
                    module_key,
                    scope_label,
                    task_label,
                    status,
                    note,
                    updated_by,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY scope_type, scope_key, module_key, task_type
                        ORDER BY created_at DESC
                    ) AS rn
                FROM sys_cutover_close_task
                WHERE scope_type = 'module'
            ) latest
            WHERE rn = 1
              AND status = 'in_progress'
              AND created_at <= CURRENT_TIMESTAMP - INTERVAL '24 hour'
              AND (? IS NULL OR module_key = ?)
            ORDER BY created_at ASC
            LIMIT ?
            """;
        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> mapCloseTaskReminder(rs, "close_task_stale"),
            normalizeModuleScope(requestedModuleKey),
            normalizeModuleScope(requestedModuleKey),
            limit
        );
    }

    private ReminderItemDto mapCloseTaskReminder(ResultSet rs, String type) throws SQLException {
        String taskId = rs.getString("task_id");
        String moduleKey = rs.getString("module_key");
        String scopeLabel = rs.getString("scope_label");
        String taskLabel = rs.getString("task_label");
        String note = rs.getString("note");
        String updatedBy = rs.getString("updated_by");
        LocalDateTime createdAt = toLocalDateTime(rs.getTimestamp("created_at"));
        boolean blocked = "close_task_blocked".equals(type);
        long staleHours = createdAt == null ? 0 : ChronoUnit.HOURS.between(createdAt, LocalDateTime.now());
        String title = blocked ? "Close task blocked" : "Close task stale";
        String content = blocked
            ? String.format(
                "Close task [%s · %s] is blocked.%s%s",
                scopeLabel,
                taskLabel,
                hasText(note) ? " Note: " + note : "",
                hasText(updatedBy) ? " Updated by: " + updatedBy : ""
            )
            : String.format(
                "Close task [%s · %s] has stayed in progress for %d hours.%s%s",
                scopeLabel,
                taskLabel,
                Math.max(staleHours, 24),
                hasText(note) ? " Note: " + note : "",
                hasText(updatedBy) ? " Updated by: " + updatedBy : ""
            );
        return new ReminderItemDto(
            type + ":" + taskId,
            type,
            blocked ? "critical" : "warning",
            title,
            content,
            moduleKey,
            null,
            scopeLabel,
            createdAt
        );
    }

    private List<String> resolveModelNames(String moduleKey) {
        if (moduleKey == null || moduleKey.isBlank()) {
            return List.of();
        }
        String trimmed = moduleKey.trim();
        Set<String> names = new LinkedHashSet<>();
        names.add(Character.toUpperCase(trimmed.charAt(0)) + trimmed.substring(1));
        names.add(Character.toLowerCase(trimmed.charAt(0)) + trimmed.substring(1));
        return names.stream().filter(value -> value != null && !value.isBlank()).toList();
    }

    private String quoteSqlStrings(List<String> values) {
        return values.stream()
            .map(value -> "'" + value.replace("'", "''") + "'")
            .collect(Collectors.joining(", "));
    }

    private LocalDateTime toLocalDateTime(Timestamp value) {
        return value == null ? null : value.toLocalDateTime();
    }

    private String normalizeModuleScope(String requestedModuleKey) {
        return requestedModuleKey == null || requestedModuleKey.isBlank() ? null : requestedModuleKey.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private int severityRank(String severity) {
        if ("critical".equalsIgnoreCase(severity)) {
            return 3;
        }
        if ("warning".equalsIgnoreCase(severity)) {
            return 2;
        }
        return 1;
    }

    private record EvidenceRequirement(String alias, String prefix, String label) {}
}
