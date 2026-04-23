package com.erp.server.common.exception;

import com.erp.server.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private boolean isUserFacingMessage(String message) {
        if (message == null) return false;
        String trimmed = message.trim();
        if (trimmed.isEmpty()) return false;
        if (trimmed.length() > 160) return false;
        if (trimmed.contains("\n") || trimmed.contains("\r") || trimmed.contains("\t")) return false;

        String lower = trimmed.toLowerCase();
        String[] technicalMarkers = new String[] {
                "exception",
                "stacktrace",
                "org.springframework",
                "java.",
                "javax.",
                "jakarta.",
                "com.erp",
                "psql",
                "postgres",
                "sql",
                "select ",
                "insert ",
                "update ",
                "delete "
        };
        for (String marker : technicalMarkers) {
            if (lower.contains(marker)) return false;
        }
        return true;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<String> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("参数校验失败");
        return Result.error(message);
    }

    @ExceptionHandler(Exception.class)
    public Result<String> handleException(Exception ex) {
        log.error("Unhandled application exception", ex);
        String message = ex.getMessage();
        if (isUserFacingMessage(message)) {
            return Result.error(message);
        }
        return Result.error("服务端异常");
    }
}
