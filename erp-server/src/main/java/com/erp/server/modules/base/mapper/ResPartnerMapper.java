package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.ResPartner;
import com.erp.server.modules.base.dto.query.ResPartnerQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ResPartnerMapper extends BaseMapper<ResPartner>, QueryPageMapper<ResPartner, ResPartnerQueryDto> {}