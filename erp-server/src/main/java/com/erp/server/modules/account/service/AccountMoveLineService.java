package com.erp.server.modules.account.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.entity.AccountMoveLine;
import com.erp.server.modules.account.dto.AccountMoveLineDto;
import com.erp.server.modules.account.dto.query.AccountMoveLineQueryDto;
import com.erp.server.modules.account.mapper.AccountMoveLineMapper;
import org.springframework.stereotype.Service;
@Service
public class AccountMoveLineService extends BaseCrudDtoService<AccountMoveLineMapper, AccountMoveLine, AccountMoveLineDto, AccountMoveLineQueryDto> {
    @Override public Class<AccountMoveLine> getEntityClass() { return AccountMoveLine.class; }
    @Override protected Class<AccountMoveLineDto> getDtoClass() { return AccountMoveLineDto.class; }
}
