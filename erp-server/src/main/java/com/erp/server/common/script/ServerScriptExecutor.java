package com.erp.server.common.script;

import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class ServerScriptExecutor {

    private static final Pattern SIMPLE_IF_THROW_PATTERN = Pattern.compile(
        "if\\s*\\(\\s*doc\\.([a-zA-Z0-9_]+)\\s*(==|!=|>=|<=|>|<)\\s*(?:'([^']*)'|\"([^\"]*)\"|([0-9]+(?:\\.[0-9]+)?))\\s*\\)\\s*\\{\\s*throw\\s+new\\s+RuntimeException\\('([^']*)'\\)\\s*\\}",
        Pattern.DOTALL
    );
    private static final Pattern SIMPLE_ACTION_THROW_PATTERN = Pattern.compile(
        "if\\s*\\(\\s*action\\s*(==|!=)\\s*(?:'([^']*)'|\"([^\"]*)\")\\s*\\)\\s*\\{\\s*throw\\s+new\\s+RuntimeException\\('([^']*)'\\)\\s*\\}",
        Pattern.DOTALL
    );
    private static final Pattern SIMPLE_DOC_NULL_THROW_PATTERN = Pattern.compile(
        "if\\s*\\(\\s*doc\\.([a-zA-Z0-9_]+)\\s*(==|!=)\\s*null\\s*\\)\\s*\\{\\s*throw\\s+new\\s+RuntimeException\\('([^']*)'\\)\\s*\\}",
        Pattern.DOTALL
    );
    private static final Pattern SIMPLE_ACTION_AND_DOC_THROW_PATTERN = Pattern.compile(
        "if\\s*\\(\\s*action\\s*(==|!=)\\s*(?:'([^']*)'|\"([^\"]*)\")\\s*&&\\s*doc\\.([a-zA-Z0-9_]+)\\s*(==|!=|>=|<=|>|<)\\s*(?:null|'([^']*)'|\"([^\"]*)\"|([0-9]+(?:\\.[0-9]+)?))\\s*\\)\\s*\\{\\s*throw\\s+new\\s+RuntimeException\\('([^']*)'\\)\\s*\\}",
        Pattern.DOTALL
    );

    private final JdbcTemplate jdbcTemplate;

    public void execute(String model, String eventName, Object doc, Object entity, String action) {
        if (!hasScriptTable()) {
            return;
        }
        List<String> scripts = jdbcTemplate.query(
            """
            SELECT script_code
            FROM sys_script
            WHERE model = ? AND event_name = ? AND status = 1
            ORDER BY id ASC
            """,
            (rs, rowNum) -> rs.getString("script_code"),
            model,
            eventName
        );
        for (String script : scripts) {
            runScript(model, eventName, script, doc, entity, action);
        }
    }

    private boolean hasScriptTable() {
        Boolean exists = jdbcTemplate.queryForObject(
            "SELECT to_regclass('public.sys_script') IS NOT NULL",
            Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private void runScript(String model, String eventName, String scriptCode, Object doc, Object entity, String action) {
        try {
            Object effectiveDoc = doc != null ? doc : entity;
            Binding binding = new Binding();
            // before_save exposes DTO as doc; before_action exposes the loaded
            // entity as doc too, so implementers can reuse ERPNext-style snippets.
            binding.setVariable("doc", effectiveDoc);
            binding.setVariable("entity", entity);
            binding.setVariable("action", action);
            binding.setVariable("log", log);
            GroovyShell shell = new GroovyShell(binding);
            shell.evaluate(scriptCode);
        } catch (Throwable ex) {
            if (isGroovyRuntimeIncompatible(ex)) {
                executeFallbackRule(scriptCode, doc != null ? doc : entity, action);
                return;
            }
            if (ex instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new RuntimeException("执行业务脚本失败 [" + model + "." + eventName + "]: " + ex.getMessage(), ex);
        }
    }

    private boolean isGroovyRuntimeIncompatible(Throwable throwable) {
        String message = throwable == null ? null : throwable.getMessage();
        return message != null && message.contains("Unsupported class file major version");
    }

    private void executeFallbackRule(String scriptCode, Object doc, String action) {
        String normalizedScript = scriptCode == null ? "" : scriptCode.trim();

        // Keep the fallback grammar intentionally small and explicit so the
        // platform layer can ship ERPNext-style guardrails without depending on
        // full Groovy compatibility in every runtime.
        Matcher actionAndDocMatcher = SIMPLE_ACTION_AND_DOC_THROW_PATTERN.matcher(normalizedScript);
        if (actionAndDocMatcher.matches()) {
            String actionOperator = actionAndDocMatcher.group(1);
            Object actionRight = literalValue(actionAndDocMatcher.group(2), actionAndDocMatcher.group(3), null, false);
            String fieldName = actionAndDocMatcher.group(4);
            String fieldOperator = actionAndDocMatcher.group(5);
            Object fieldRight = literalValue(actionAndDocMatcher.group(6), actionAndDocMatcher.group(7), actionAndDocMatcher.group(8), true);
            String errorMessage = actionAndDocMatcher.group(9);
            if (compare(action, actionRight, actionOperator) && compare(readDocField(doc, fieldName), fieldRight, fieldOperator)) {
                throw new RuntimeException(errorMessage);
            }
            return;
        }

        Matcher actionMatcher = SIMPLE_ACTION_THROW_PATTERN.matcher(normalizedScript);
        if (actionMatcher.matches()) {
            String operator = actionMatcher.group(1);
            Object right = literalValue(actionMatcher.group(2), actionMatcher.group(3), null, false);
            String errorMessage = actionMatcher.group(4);
            if (compare(action, right, operator)) {
                throw new RuntimeException(errorMessage);
            }
            return;
        }

        Matcher nullMatcher = SIMPLE_DOC_NULL_THROW_PATTERN.matcher(normalizedScript);
        if (nullMatcher.matches()) {
            String fieldName = nullMatcher.group(1);
            String operator = nullMatcher.group(2);
            String errorMessage = nullMatcher.group(3);
            if (compare(readDocField(doc, fieldName), null, operator)) {
                throw new RuntimeException(errorMessage);
            }
            return;
        }
        Matcher matcher = SIMPLE_IF_THROW_PATTERN.matcher(normalizedScript);
        if (!matcher.matches()) {
            throw new RuntimeException("Groovy 在当前 JDK 不兼容，且脚本不符合降级规则格式");
        }
        String fieldName = matcher.group(1);
        String operator = matcher.group(2);
        String stringSingle = matcher.group(3);
        String stringDouble = matcher.group(4);
        String numberValue = matcher.group(5);
        String errorMessage = matcher.group(6);

        Object left = readDocField(doc, fieldName);
        Object right = literalValue(stringSingle, stringDouble, numberValue, false);
        if (compare(left, right, operator)) {
            throw new RuntimeException(errorMessage);
        }
    }

    private Object literalValue(String stringSingle, String stringDouble, String numberValue, boolean allowNullLiteral) {
        if (numberValue != null) {
            return new BigDecimal(numberValue);
        }
        String stringValue = stringSingle != null ? stringSingle : stringDouble;
        if (allowNullLiteral && stringValue == null) {
            return null;
        }
        return stringValue;
    }

    private Object readDocField(Object doc, String fieldName) {
        if (doc == null || fieldName == null || fieldName.isBlank()) {
            return null;
        }
        BeanWrapper wrapper = new BeanWrapperImpl(doc);
        return wrapper.isReadableProperty(fieldName) ? wrapper.getPropertyValue(fieldName) : null;
    }

    private boolean compare(Object left, Object right, String operator) {
        if ("==".equals(operator)) {
            return normalize(left).equals(normalize(right));
        }
        if ("!=".equals(operator)) {
            return !normalize(left).equals(normalize(right));
        }
        BigDecimal leftNum = toNumber(left);
        BigDecimal rightNum = toNumber(right);
        if (leftNum == null || rightNum == null) {
            return false;
        }
        int cmp = leftNum.compareTo(rightNum);
        return switch (operator) {
            case ">" -> cmp > 0;
            case "<" -> cmp < 0;
            case ">=" -> cmp >= 0;
            case "<=" -> cmp <= 0;
            default -> false;
        };
    }

    private Object normalize(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String string) {
            return string.trim();
        }
        return String.valueOf(value);
    }

    private BigDecimal toNumber(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return new BigDecimal(number.toString());
        }
        try {
            return new BigDecimal(String.valueOf(value).trim());
        } catch (Exception ignored) {
            return null;
        }
    }
}
