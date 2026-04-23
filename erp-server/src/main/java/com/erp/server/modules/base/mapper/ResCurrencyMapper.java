package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.ResCurrency;
import com.erp.server.modules.base.dto.query.ResCurrencyQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ResCurrencyMapper extends BaseMapper<ResCurrency>, QueryPageMapper<ResCurrency, ResCurrencyQueryDto> {}