package com.erp.server.common.aspect;

import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.common.util.BeanCopyUtils;
import com.erp.server.modules.base.entity.IrLogging;
import com.erp.server.modules.base.mapper.IrLoggingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AuditAspect {

    private final IrLoggingMapper loggingMapper;
    private final JdbcTemplate jdbcTemplate;

    @Pointcut("execution(* com.erp.server.common.service.BaseCrudDtoService.updateDto(..))")
    public void updatePointcut() {}

    @Pointcut("execution(* com.erp.server.common.service.BaseCrudDtoService.saveDto(..))")
    public void savePointcut() {}

    @Pointcut("execution(* com.erp.server.common.service.BaseCrudDtoService.executeAction(..)) || execution(* com.erp.server.modules..service.*.executeAction(..))")
    public void actionPointcut() {}

    @AfterReturning(pointcut = "savePointcut()", returning = "result")
    public void afterSave(JoinPoint joinPoint, Object result) {
        if (Boolean.TRUE.equals(result)) {
            Object dto = joinPoint.getArgs()[0];
            logAudit(joinPoint, "CREATE", dto, null);
        }
    }

    @AfterReturning(pointcut = "updatePointcut()", returning = "result")
    public void afterUpdate(JoinPoint joinPoint, Object result) {
        if (Boolean.TRUE.equals(result)) {
            Object dto = joinPoint.getArgs()[1];
            logAudit(joinPoint, "UPDATE", dto, null, joinPoint.getArgs()[0]);
        }
    }

    @AfterReturning(pointcut = "actionPointcut()", returning = "result")
    public void afterAction(JoinPoint joinPoint, Object result) {
        if (Boolean.TRUE.equals(result)) {
            Object id = joinPoint.getArgs()[0];
            Object action = joinPoint.getArgs()[1];
            logAudit(joinPoint, "ACTION", null, String.valueOf(action), id);
        }
    }

    private void logAudit(JoinPoint joinPoint, String type, Object dto, String metadata) {
        logAudit(joinPoint, type, dto, metadata, extractResId(dto));
    }

    private void logAudit(JoinPoint joinPoint, String type, Object dto, String metadata, Object resId) {
        try {
            Boolean tableExists = jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.ir_logging') IS NOT NULL",
                Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) {
                return;
            }
            BaseCrudDtoService<?, ?, ?, ?> service = (BaseCrudDtoService<?, ?, ?, ?>) joinPoint.getTarget();
            String modelName = service.getEntityClass().getSimpleName();
            
            IrLogging entry = new IrLogging();
            entry.setType(type);
            entry.setName(modelName);
            entry.setLevel("INFO");
            entry.setCreateDate(LocalDateTime.now());
            entry.setResModel(modelName);
            if (resId instanceof Number number) {
                entry.setResId(number.intValue());
            }
            entry.setMetadata(metadata);
            entry.setMessage(buildMessage(type, modelName, metadata, entry.getResId()));
            loggingMapper.insert(entry);
        } catch (Exception e) {
            log.error("Audit logging failed", e);
        }
    }

    private Object extractResId(Object dto) {
        if (dto == null) {
            return null;
        }
        return BeanCopyUtils.getFieldValue(dto, "id");
    }

    private String buildMessage(String type, String modelName, String metadata, Integer resId) {
        String actionText = metadata == null || metadata.isBlank() ? "" : " · " + metadata;
        String recordText = resId == null ? "" : " #" + resId;
        return type + " " + modelName + recordText + actionText;
    }
}
