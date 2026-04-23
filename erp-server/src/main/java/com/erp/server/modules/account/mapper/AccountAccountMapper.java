package com.erp.server.modules.account.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.account.entity.AccountAccount;
import com.erp.server.modules.account.dto.query.AccountAccountQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface AccountAccountMapper extends BaseMapper<AccountAccount>, QueryPageMapper<AccountAccount, AccountAccountQueryDto> {}