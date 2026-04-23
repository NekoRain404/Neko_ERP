package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.ResCompany;
import com.erp.server.modules.base.dto.query.ResCompanyQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ResCompanyMapper extends BaseMapper<ResCompany>, QueryPageMapper<ResCompany, ResCompanyQueryDto> {}