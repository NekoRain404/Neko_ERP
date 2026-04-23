package com.erp.server.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;

import java.io.Serializable;
import java.util.List;
import java.util.function.Function;

@Data
public class PageResult<T> implements Serializable {
    private static final long serialVersionUID = 1L;

    private List<T> records;
    private long total;
    private long size;
    private long current;
    private long pages;

    public static <T> PageResult<T> from(IPage<T> page) {
        PageResult<T> result = new PageResult<>();
        result.setRecords(page.getRecords());
        result.setTotal(page.getTotal());
        result.setSize(page.getSize());
        result.setCurrent(page.getCurrent());
        result.setPages(page.getPages());
        return result;
    }

    public static <S, T> PageResult<T> from(IPage<S> page, Function<S, T> mapper) {
        PageResult<T> result = new PageResult<>();
        result.setRecords(page.getRecords().stream().map(mapper).toList());
        result.setTotal(page.getTotal());
        result.setSize(page.getSize());
        result.setCurrent(page.getCurrent());
        result.setPages(page.getPages());
        return result;
    }
}
