package com.erp.server.modules.purchase.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.purchase.entity.PurchaseOrderLine;
import com.erp.server.modules.purchase.dto.query.PurchaseOrderLineQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface PurchaseOrderLineMapper extends BaseMapper<PurchaseOrderLine>, QueryPageMapper<PurchaseOrderLine, PurchaseOrderLineQueryDto> {}