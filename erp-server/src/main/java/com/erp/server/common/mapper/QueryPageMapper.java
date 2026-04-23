package com.erp.server.common.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.erp.server.common.query.BasePageQuery;
import org.apache.ibatis.annotations.Param;

public interface QueryPageMapper<E, Q extends BasePageQuery> {

    IPage<E> selectPageByQuery(Page<E> page, @Param("query") Q query);
}
