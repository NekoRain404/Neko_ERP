package com.erp.server.modules.purchase.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.purchase.entity.PurchaseOrder;
import com.erp.server.modules.purchase.dto.query.PurchaseOrderQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface PurchaseOrderMapper extends BaseMapper<PurchaseOrder>, QueryPageMapper<PurchaseOrder, PurchaseOrderQueryDto> {}