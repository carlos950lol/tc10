USE sistema_academico;

ALTER TABLE alumno
    MODIFY COLUMN grupo ENUM('A1','B1','A2','B2','A3','B3','A4','B4','A5','B5','A6','B6') NULL;

SET @dni_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'alumno'
      AND index_name = 'uq_alumno_dni'
      AND non_unique = 0
);
SET @dni_index_statement = IF(
    @dni_index_exists = 0,
    'CREATE UNIQUE INDEX uq_alumno_dni ON alumno (dni)',
    'SELECT 1'
);
PREPARE dni_index_migration FROM @dni_index_statement;
EXECUTE dni_index_migration;
DEALLOCATE PREPARE dni_index_migration;
