package com.erp.server.common.aspect;

import com.erp.server.common.script.ServerScriptExecutor;
import com.erp.server.common.service.BaseCrudDtoService;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class ServerScriptAspect {

    private final ServerScriptExecutor serverScriptExecutor;

    @Before("execution(* com.erp.server.common.service.BaseCrudDtoService.executeAction(..)) || execution(* com.erp.server.modules..service.*.executeAction(..))")
    public void beforeExecuteAction(JoinPoint joinPoint) {
        if (!(joinPoint.getTarget() instanceof BaseCrudDtoService<?, ?, ?, ?> service)) {
            return;
        }
        Object[] args = joinPoint.getArgs();
        if (args.length < 2 || !(args[0] instanceof Long id) || !(args[1] instanceof String action)) {
            return;
        }
        Object entity = service.getById(id);
        if (entity == null) {
            return;
        }
        serverScriptExecutor.execute(service.getEntityClass().getSimpleName(), "before_action", null, entity, action);
    }
}
