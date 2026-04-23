package com.erp.server.modules.account.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.erp.server.common.mapper.QueryPageMapper;
import com.erp.server.modules.account.entity.AccountMove;
import com.erp.server.modules.account.dto.query.AccountMoveQueryDto;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface AccountMoveMapper extends BaseMapper<AccountMove>, QueryPageMapper<AccountMove, AccountMoveQueryDto> {}