package com.erp.server.modules.account.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.entity.AccountAccount;
import com.erp.server.modules.account.dto.AccountAccountDto;
import com.erp.server.modules.account.dto.query.AccountAccountQueryDto;
import com.erp.server.modules.account.mapper.AccountAccountMapper;
import org.springframework.stereotype.Service;
@Service
public class AccountAccountService extends BaseCrudDtoService<AccountAccountMapper, AccountAccount, AccountAccountDto, AccountAccountQueryDto> {
    @Override public Class<AccountAccount> getEntityClass() { return AccountAccount.class; }
    @Override protected Class<AccountAccountDto> getDtoClass() { return AccountAccountDto.class; }
}
