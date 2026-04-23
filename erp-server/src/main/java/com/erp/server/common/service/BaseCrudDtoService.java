package com.erp.server.common.service;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.erp.server.common.PageResult;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.common.query.BasePageQuery;
import com.erp.server.common.script.ServerScriptExecutor;
import com.erp.server.common.util.BeanCopyUtils;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.util.List;
import java.util.stream.Collectors;

public abstract class BaseCrudDtoService<M extends BaseMapper<E> & QueryPageMapper<E, Q>, E, D, Q extends BasePageQuery>
        extends ServiceImpl<M, E> {

    @Autowired
    private ObjectProvider<ServerScriptExecutor> serverScriptExecutorProvider;

    public abstract Class<E> getEntityClass();
    protected abstract Class<D> getDtoClass();

    @Override public boolean removeById(Serializable id) { return super.removeById(id); }

    public PageResult<D> pageDto(Q query) {
        long current = query == null ? 1L : Math.max(query.getCurrent(), 1L);
        long size = query == null ? 10L : Math.max(query.getSize(), 1L);
        IPage<E> page = this.baseMapper.selectPageByQuery(new Page<>(current, size), query);
        return PageResult.from(page, this::toDto);
    }

    public List<D> listDto(Q query) {
        return this.list().stream().map(this::toDto).collect(Collectors.toList());
    }

    public D getDtoById(Serializable id) {
        return toDto(this.getById(id));
    }

    protected void beforeSaveDto(D dto) {}

    protected void beforeUpdateDto(Serializable id, D dto) {}

    @Transactional(rollbackFor = Exception.class)
    public boolean saveDto(D dto) {
        executeServerScript("before_save", dto, null, null);
        beforeSaveDto(dto);
        E entity = toEntity(dto);
        boolean saved = this.save(entity);
        if (saved) {
            BeanCopyUtils.setFieldValue(dto, "id", BeanCopyUtils.getFieldValue(entity, "id"));
        }
        return saved;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean updateDto(Serializable id, D dto) {
        executeServerScript("before_save", dto, null, null);
        beforeUpdateDto(id, dto);
        E entity = this.getById(id);
        if (entity == null) {
            return false;
        }
        BeanCopyUtils.copyNonNullProperties(dto, entity);
        if (BeanCopyUtils.getFieldValue(dto, "extData") == null) {
            BeanCopyUtils.setFieldValue(entity, "extData", null);
        }
        BeanCopyUtils.setFieldValue(entity, "id", id);
        return this.updateById(entity);
    }

    public boolean executeAction(Long id, String action) {
        E entity = getById(id);
        if (entity == null) return false;
        return applyStateAction(entity, action);
    }

    protected boolean applyStateAction(E entity, String action) {
        if (!action.startsWith("action_")) {
            return false;
        }
        try {
            java.lang.reflect.Field stateField = getEntityClass().getDeclaredField("state");
            stateField.setAccessible(true);
            stateField.set(entity, action.replace("action_", ""));
            return updateById(entity);
        } catch (Exception e) {
            return false;
        }
    }

    public D toDto(E entity) { return BeanCopyUtils.copy(entity, getDtoClass()); }
    public E toEntity(D dto) { return BeanCopyUtils.copy(dto, getEntityClass()); }

    protected void executeServerScript(String eventName, D dto, E entity, String action) {
        ServerScriptExecutor executor = serverScriptExecutorProvider.getIfAvailable();
        if (executor == null) {
            return;
        }
        executor.execute(getEntityClass().getSimpleName(), eventName, dto, entity, action);
    }
}
