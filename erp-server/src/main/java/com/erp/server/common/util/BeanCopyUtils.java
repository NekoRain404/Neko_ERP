package com.erp.server.common.util;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class BeanCopyUtils {

    private BeanCopyUtils() {
    }

    public static <T> T copy(Object source, Class<T> targetClass) {
        if (source == null) {
            return null;
        }
        T target = BeanUtils.instantiateClass(targetClass);
        BeanUtils.copyProperties(source, target);
        return target;
    }

    public static <T> List<T> copyList(List<?> source, Class<T> targetClass) {
        return source.stream().map(item -> copy(item, targetClass)).toList();
    }

    public static void copyNonNullProperties(Object source, Object target) {
        BeanUtils.copyProperties(source, target, getNullPropertyNames(source));
    }

    public static void setFieldValue(Object target, String fieldName, Object value) {
        Field field = ReflectionUtils.findField(target.getClass(), fieldName);
        if (field == null) {
            return;
        }
        ReflectionUtils.makeAccessible(field);
        ReflectionUtils.setField(field, target, value);
    }

    public static Object getFieldValue(Object target, String fieldName) {
        Field field = ReflectionUtils.findField(target.getClass(), fieldName);
        if (field == null) {
            return null;
        }
        ReflectionUtils.makeAccessible(field);
        return ReflectionUtils.getField(field, target);
    }

    private static String[] getNullPropertyNames(Object source) {
        BeanWrapper src = new BeanWrapperImpl(source);
        Set<String> emptyNames = new HashSet<>();
        for (var propertyDescriptor : src.getPropertyDescriptors()) {
            String propertyName = propertyDescriptor.getName();
            Object propertyValue = src.getPropertyValue(propertyName);
            if (propertyValue == null) {
                emptyNames.add(propertyName);
            }
        }
        return emptyNames.toArray(String[]::new);
    }
}
