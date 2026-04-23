package com.erp.server.modules.account.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.account.entity.AccountInvoice;
import com.erp.server.modules.account.dto.query.AccountInvoiceQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface AccountInvoiceMapper extends BaseMapper<AccountInvoice>, QueryPageMapper<AccountInvoice, AccountInvoiceQueryDto> {}
