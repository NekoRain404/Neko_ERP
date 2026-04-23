package com.erp.server.modules.account.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.account.entity.AccountJournal;
import com.erp.server.modules.account.dto.query.AccountJournalQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface AccountJournalMapper extends BaseMapper<AccountJournal>, QueryPageMapper<AccountJournal, AccountJournalQueryDto> {}