DO $$
DECLARE
    seq_row RECORD;
    max_id BIGINT;
BEGIN
    FOR seq_row IN
        SELECT
            c.table_schema,
            c.table_name,
            c.column_name,
            pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) AS sequence_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'id'
    LOOP
        IF seq_row.sequence_name IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
            seq_row.column_name,
            seq_row.table_schema,
            seq_row.table_name
        )
        INTO max_id;

        IF max_id > 0 THEN
            EXECUTE format(
                'SELECT setval(%L, %s, true)',
                seq_row.sequence_name,
                max_id
            );
        ELSE
            EXECUTE format(
                'SELECT setval(%L, 1, false)',
                seq_row.sequence_name
            );
        END IF;
    END LOOP;
END $$;
