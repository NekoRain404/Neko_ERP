package com.erp.server.modules.account.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.account.entity.AccountPayment;
import com.erp.server.modules.account.dto.query.AccountPaymentQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface AccountPaymentMapper extends BaseMapper<AccountPayment>, QueryPageMapper<AccountPayment, AccountPaymentQueryDto> {}