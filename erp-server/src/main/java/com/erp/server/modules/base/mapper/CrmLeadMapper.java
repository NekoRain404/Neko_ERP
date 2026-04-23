package com.erp.server.modules.base.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.base.entity.CrmLead;
import com.erp.server.modules.base.dto.query.CrmLeadQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface CrmLeadMapper extends BaseMapper<CrmLead>, QueryPageMapper<CrmLead, CrmLeadQueryDto> {}