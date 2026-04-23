package com.erp.server.modules.account.service;
import com.erp.server.common.service.BaseCrudDtoService;
import com.erp.server.modules.account.entity.AccountJournal;
import com.erp.server.modules.account.dto.AccountJournalDto;
import com.erp.server.modules.account.dto.query.AccountJournalQueryDto;
import com.erp.server.modules.account.mapper.AccountJournalMapper;
import org.springframework.stereotype.Service;
@Service
public class AccountJournalService extends BaseCrudDtoService<AccountJournalMapper, AccountJournal, AccountJournalDto, AccountJournalQueryDto> {
    @Override public Class<AccountJournal> getEntityClass() { return AccountJournal.class; }
    @Override protected Class<AccountJournalDto> getDtoClass() { return AccountJournalDto.class; }
}
