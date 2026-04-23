package com.erp.server.common.interceptor;

import com.baomidou.mybatisplus.extension.plugins.handler.DataPermissionHandler;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;
import net.sf.jsqlparser.expression.operators.conditional.AndExpression;
import net.sf.jsqlparser.expression.operators.relational.EqualsTo;
import net.sf.jsqlparser.schema.Column;
import org.springframework.stereotype.Component;

@Component
public class DataSecurityInterceptor implements DataPermissionHandler {

    private static final String[] COMPANY_SCOPED_MAPPERS = new String[] {
            "ResPartner",
            "ProductTemplate",
            "ProductPricelist",
            "SaleOrder",
            "SaleOrderLine",
            "PurchaseOrder",
            "PurchaseOrderLine",
            "StockPicking",
            "StockMove",
            "StockQuant",
            "AccountMove",
            "AccountMoveLine",
            "AccountInvoice"
    };

    @Override
    public Expression getSqlSegment(Expression where, String mappedStatementId) {
        // 模拟当前用户所属公司 ID 为 1
        // 实际开发中应从 SecurityContextHolder 获取
        Long currentCompanyId = 1L;

        if (!isCompanyScopedMapper(mappedStatementId)) {
            return where;
        }

        // 构造 company_id = 1 表达式
        EqualsTo equalsTo = new EqualsTo();
        equalsTo.setLeftExpression(new Column("company_id"));
        equalsTo.setRightExpression(new LongValue(currentCompanyId));

        return where == null ? equalsTo : new AndExpression(where, equalsTo);
    }

    private boolean isCompanyScopedMapper(String mappedStatementId) {
        if (mappedStatementId == null || mappedStatementId.isBlank()) {
            return false;
        }
        for (String mapper : COMPANY_SCOPED_MAPPERS) {
            if (mappedStatementId.contains(mapper)) {
                return true;
            }
        }
        return false;
    }
}
