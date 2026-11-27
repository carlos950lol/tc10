-- =============================================================
-- SISTEMA DE GESTION DE PROCESOS ACADEMICOS
-- MySQL 8.0 - Modelo normalizado para MySQL Workbench
-- =============================================================

CREATE DATABASE IF NOT EXISTS sistema_academico
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE sistema_academico;

-- SOLO PARA PRUEBAS: elimina todas las tablas y los datos de esta base.
-- Cada ejecucion reconstruye el esquema y carga los datos demo.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS
    promedio,
    asignacion_docente,
    respuesta_reclamo,
    apoderado,
    calificacion,
    asistencia,
    matricula,
    pago,
    constancia,
    tarea,
    reclamo,
    seccion,
    usuario,
    docente,
    curso,
    anio_academico,
    alumno;
SET FOREIGN_KEY_CHECKS = 1;

SET @cargar_datos_demo := 1;

-- Alumnos del instituto.
CREATE TABLE IF NOT EXISTS alumno (
    idAlumno INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    nivel ENUM('primaria', 'secundaria') NOT NULL,
    grado TINYINT UNSIGNED NOT NULL,
    seccion ENUM('A', 'B', 'C') NOT NULL,
    dni VARCHAR(15) NOT NULL,
    correo VARCHAR(150) NULL,
    telefono VARCHAR(20) NULL,
    fechaNacimiento DATE NULL,
    sexo VARCHAR(20) NULL,
    procedencia VARCHAR(100) NULL,
    direccion VARCHAR(255) NULL,
    estado VARCHAR(20) NULL DEFAULT 'activo',
    PRIMARY KEY (idAlumno),
    UNIQUE KEY uq_alumno_dni (dni),
    UNIQUE KEY uq_alumno_correo (correo),
    CONSTRAINT chk_alumno_grado CHECK (
        (nivel = 'primaria' AND grado BETWEEN 1 AND 6) OR
        (nivel = 'secundaria' AND grado BETWEEN 1 AND 5)
    )
) ENGINE=InnoDB;

-- Datos de contacto ficticios de un apoderado por alumno.
CREATE TABLE IF NOT EXISTS apoderado (
    idApoderado INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    dni VARCHAR(15) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    observaciones VARCHAR(255) NULL,
    PRIMARY KEY (idApoderado),
    UNIQUE KEY uq_apoderado_alumno (idAlumno),
    UNIQUE KEY uq_apoderado_dni (dni),
    CONSTRAINT fk_apoderado_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Docentes responsables de las secciones.
CREATE TABLE IF NOT EXISTS docente (
    idDocente INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100) NULL,
    correo VARCHAR(150) NULL,
    telefono VARCHAR(20) NULL,
    nrcCurso INT NOT NULL,
    estado VARCHAR(20) NULL DEFAULT 'activo',
    PRIMARY KEY (idDocente),
    UNIQUE KEY uq_docente_correo (correo)
) ENGINE=InnoDB;

-- Cursos academicos disponibles.
CREATE TABLE IF NOT EXISTS curso (
    nrcCurso INT NOT NULL,
    nombreCurso VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255) NULL,
    creditos INT NULL,
    horasSemanal INT NULL,
    estado VARCHAR(20) NULL DEFAULT 'activo',
    PRIMARY KEY (nrcCurso)
) ENGINE=InnoDB;

ALTER TABLE docente
    ADD UNIQUE KEY uq_docente_id_curso (idDocente, nrcCurso),
    ADD CONSTRAINT fk_docente_curso FOREIGN KEY (nrcCurso)
        REFERENCES curso (nrcCurso)
        ON UPDATE CASCADE ON DELETE RESTRICT;

-- Matricula: entidad asociativa entre alumno, curso y su ubicacion escolar.
CREATE TABLE IF NOT EXISTS matricula (
    idMatricula INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    nrcCurso INT NOT NULL,
    fecha DATE NOT NULL,
    periodoAcademico VARCHAR(20) NOT NULL,
    nivel ENUM('primaria', 'secundaria') NOT NULL,
    grado TINYINT UNSIGNED NOT NULL,
    seccion ENUM('A', 'B', 'C') NOT NULL,
    estado VARCHAR(20) NULL DEFAULT 'activa',
    modalidad VARCHAR(30) NULL,
    fechaRegistro DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (idMatricula),
    UNIQUE KEY uq_matricula_alumno_curso_periodo (idAlumno, nrcCurso, periodoAcademico),
    KEY idx_matricula_curso_ubicacion_periodo
        (nrcCurso, nivel, grado, seccion, periodoAcademico, estado),
    CONSTRAINT fk_matricula_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_matricula_curso FOREIGN KEY (nrcCurso)
        REFERENCES curso (nrcCurso)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_matricula_grado CHECK (
        (nivel = 'primaria' AND grado BETWEEN 1 AND 6) OR
        (nivel = 'secundaria' AND grado BETWEEN 1 AND 5)
    )
) ENGINE=InnoDB;

-- Calificaciones por alumno y curso.
CREATE TABLE IF NOT EXISTS calificacion (
    idCalificacion INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    nrcCurso INT NOT NULL,
    tipoEvaluacion VARCHAR(50) NOT NULL,
    nota DECIMAL(5,2) NOT NULL,
    fecha DATE NOT NULL,
    porcentaje DECIMAL(5,2) NULL,
    observacion VARCHAR(255) NULL,
    estado VARCHAR(20) NULL DEFAULT 'registrada',
    PRIMARY KEY (idCalificacion),
    KEY idx_calificacion_alumno (idAlumno),
    KEY idx_calificacion_curso (nrcCurso),
    CONSTRAINT fk_calificacion_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_calificacion_curso FOREIGN KEY (nrcCurso)
        REFERENCES curso (nrcCurso)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_calificacion_nota CHECK (nota >= 0 AND nota <= 20),
    CONSTRAINT chk_calificacion_porcentaje CHECK (porcentaje IS NULL OR (porcentaje >= 0 AND porcentaje <= 100))
) ENGINE=InnoDB;

-- Asistencias por alumno y curso.
CREATE TABLE IF NOT EXISTS asistencia (
    idAsistencia INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    nrcCurso INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NULL,
    estado VARCHAR(20) NOT NULL,
    observacion VARCHAR(255) NULL,
    tipoSesion VARCHAR(50) NULL,
    PRIMARY KEY (idAsistencia),
    UNIQUE KEY uq_asistencia_alumno_curso_fecha (idAlumno, nrcCurso, fecha),
    KEY idx_asistencia_curso (nrcCurso),
    CONSTRAINT fk_asistencia_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_asistencia_curso FOREIGN KEY (nrcCurso)
        REFERENCES curso (nrcCurso)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Reclamos registrados por alumnos.
CREATE TABLE IF NOT EXISTS reclamo (
    idReclamo INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    fecha DATE NOT NULL,
    motivo VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500) NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    fechaAtencion DATE NULL,
    prioridad VARCHAR(20) NULL DEFAULT 'normal',
    PRIMARY KEY (idReclamo),
    KEY idx_reclamo_alumno (idAlumno),
    CONSTRAINT fk_reclamo_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Respuestas emitidas para atender reclamos.
CREATE TABLE IF NOT EXISTS respuesta_reclamo (
    idRespuesta INT NOT NULL AUTO_INCREMENT,
    idReclamo INT NOT NULL,
    fecha DATE NOT NULL,
    respuesta VARCHAR(500) NOT NULL,
    estado VARCHAR(30) NULL,
    observacion VARCHAR(255) NULL,
    responsable VARCHAR(100) NULL,
    PRIMARY KEY (idRespuesta),
    KEY idx_respuesta_reclamo (idReclamo),
    CONSTRAINT fk_respuesta_reclamo FOREIGN KEY (idReclamo)
        REFERENCES reclamo (idReclamo)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pagos realizados por alumnos.
CREATE TABLE IF NOT EXISTS pago (
    idPago INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    fechaPago DATE NULL,
    monto DECIMAL(10,2) NOT NULL,
    concepto VARCHAR(150) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    metodoPago VARCHAR(50) NULL,
    numeroOperacion VARCHAR(100) NULL,
    fechaVencimiento DATE NULL,
    comprobante VARCHAR(255) NULL,
    PRIMARY KEY (idPago),
    KEY idx_pago_alumno (idAlumno),
    CONSTRAINT fk_pago_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Constancias academicas solicitadas por alumnos.
CREATE TABLE IF NOT EXISTS constancia (
    idConstancia INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    fechaEmision DATE NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'solicitada',
    numeroConstancia VARCHAR(100) NULL,
    fechaSolicitud DATE NULL,
    observacion VARCHAR(255) NULL,
    formato VARCHAR(20) NULL,
    PRIMARY KEY (idConstancia),
    UNIQUE KEY uq_constancia_numero (numeroConstancia),
    KEY idx_constancia_alumno (idAlumno),
    CONSTRAINT fk_constancia_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Cuentas de acceso de los usuarios de prueba y usuarios institucionales.
CREATE TABLE IF NOT EXISTS usuario (
    idUsuario INT NOT NULL AUTO_INCREMENT,
    correo VARCHAR(150) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol ENUM('teacher', 'student', 'jefe', 'registrador') NOT NULL,
    idAlumno INT NULL,
    idDocente INT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    debeCambiarContrasena TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (idUsuario),
    UNIQUE KEY uq_usuario_correo (correo),
    CONSTRAINT fk_usuario_alumno FOREIGN KEY (idAlumno) REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_usuario_docente FOREIGN KEY (idDocente) REFERENCES docente (idDocente)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- Actividades que se muestran en Tareas y en el resumen de cada rol.
CREATE TABLE IF NOT EXISTS tarea (
    idTarea INT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(180) NOT NULL,
    nrcCurso INT NULL,
    fechaAsignacion DATE NOT NULL,
    fechaEntrega DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Tarea',
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    color VARCHAR(20) NULL DEFAULT '#4F46E5',
    PRIMARY KEY (idTarea),
    KEY idx_tarea_curso (nrcCurso),
    CONSTRAINT fk_tarea_curso FOREIGN KEY (nrcCurso) REFERENCES curso (nrcCurso)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- El modelo queda listo para Database > Reverse Engineer en Workbench.

-- =============================================================
-- DATOS DEMO PARA EL DASHBOARD
-- Periodo de referencia: 2026-II
-- =============================================================

DROP PROCEDURE IF EXISTS tc10_insertar_datos_demo;
DELIMITER $$
CREATE PROCEDURE tc10_insertar_datos_demo()
BEGIN
IF @cargar_datos_demo = 1 THEN

INSERT IGNORE INTO alumno
    (idAlumno, nombre, apellido, nivel, grado, seccion, dni, correo, telefono, fechaNacimiento, sexo, procedencia, direccion, estado)
VALUES
(1, 'Valeria', 'Castillo Rojas', 'primaria', 3, 'A', '74125896', 'vcastillo@academiadecam.edu.pe', '987654321', '2018-03-18', 'Femenino', 'Comas, Lima', 'Av. Los Alisos 184, Comas, Lima', 'activo'),
(2, 'Diego', 'Mendoza Salazar', 'primaria', 4, 'B', '72841653', 'dmendoza@academiadecam.edu.pe', '986321450', '2017-11-07', 'Masculino', 'San Juan de Lurigancho, Lima', 'Jr. Las Palmeras 527, San Juan de Lurigancho, Lima', 'activo'),
(3, 'Camila', 'Torres Huaman', 'primaria', 2, 'C', '75630981', 'ctorres@academiadecam.edu.pe', '985147236', '2019-01-25', 'Femenino', 'Villa El Salvador, Lima', 'Mz. D Lt. 16, sector 3, Villa El Salvador, Lima', 'activo'),
(4, 'Mateo', 'Quispe Navarro', 'primaria', 5, 'A', '71984562', 'mquispe@academiadecam.edu.pe', '984236517', '2016-08-12', 'Masculino', 'Ate, Lima', 'Calle Los Nogales 238, Ate, Lima', 'activo'),
(5, 'Luciana', 'Paredes Flores', 'primaria', 6, 'B', '76851420', 'lparedes@academiadecam.edu.pe', '983741526', '2015-06-30', 'Femenino', 'San Miguel, Lima', 'Jr. Maranga 415, San Miguel, Lima', 'activo'),
(6, 'Sebastian', 'Vargas Leon', 'secundaria', 1, 'C', '73419685', 'svargas@academiadecam.edu.pe', '982654713', '2014-04-16', 'Masculino', 'Los Olivos, Lima', 'Av. Las Magnolias 691, Los Olivos, Lima', 'activo'),
(7, 'Andrea', 'Salinas Vega', 'secundaria', 2, 'A', '78204519', 'asalinas@academiadecam.edu.pe', '981563742', '2013-09-21', 'Femenino', 'Chorrillos, Lima', 'Calle Los Cedros 352, Chorrillos, Lima', 'activo'),
(8, 'Nicolas', 'Fernandez Ruiz', 'secundaria', 3, 'B', '70541863', 'nfernandez@academiadecam.edu.pe', '980472631', '2012-10-03', 'Masculino', 'San Martín de Porres, Lima', 'Jr. Los Pinos 804, San Martín de Porres, Lima', 'suspendido'),
(9, 'Renata', 'Flores Medina', 'secundaria', 4, 'C', '71620384', 'rflores@academiadecam.edu.pe', '979851264', '2011-10-11', 'Femenino', 'Santiago de Surco, Lima', 'Av. Los Álamos 126, Santiago de Surco, Lima', 'activo'),
(10, 'Gabriel', 'Cruz Paredes', 'secundaria', 5, 'A', '74851629', 'gcruz@academiadecam.edu.pe', '978642315', '2010-02-27', 'Masculino', 'Pueblo Libre, Lima', 'Jr. Bolívar 473, Pueblo Libre, Lima', 'activo'),
(11, 'Sofia', 'Mamani Rios', 'primaria', 3, 'B', '76984512', 'smamani@academiadecam.edu.pe', '977531426', '2018-07-19', 'Femenino', 'Rímac, Lima', 'Calle Amancaes 219, Rímac, Lima', 'activo'),
(12, 'Bruno', 'Herrera Luna', 'secundaria', 5, 'C', '78310456', 'bherrera@academiadecam.edu.pe', '976420531', '2010-01-09', 'Masculino', 'La Victoria, Lima', 'Av. México 638, La Victoria, Lima', 'activo');

SET @nuevo_alumno := 1;
WHILE @nuevo_alumno <= 120 DO
    SET @indice_seccion := MOD(@nuevo_alumno - 1, 33);
    SET @nivel_alumno := IF(@indice_seccion < 18, 'primaria', 'secundaria');
    SET @grado_alumno := IF(
        @indice_seccion < 18,
        FLOOR(@indice_seccion / 3) + 1,
        FLOOR((@indice_seccion - 18) / 3) + 1
    );
    SET @seccion_alumno := ELT(MOD(@indice_seccion, 3) + 1, 'A', 'B', 'C');
    SET @edad_alumno := IF(@nivel_alumno = 'primaria', @grado_alumno + 5, @grado_alumno + 11)
        + MOD(@nuevo_alumno, 2);
    SET @nombre_alumno := ELT(
        MOD(@nuevo_alumno - 1, 12) + 1,
        'Ana', 'Luis', 'Mia', 'Carlos', 'Teresa', 'Pedro',
        'Sofia', 'Diego', 'Elena', 'Victor', 'Ximena', 'Rafael'
    );
    SET @apellido_alumno := ELT(
        FLOOR((@nuevo_alumno - 1) / 12) + 1,
        'Alvarez', 'Benitez', 'Campos', 'Delgado', 'Espinoza',
        'Flores', 'Garcia', 'Herrera', 'Ibarra', 'Jimenez'
    );
    INSERT INTO alumno
        (idAlumno, nombre, apellido, nivel, grado, seccion, dni, correo, telefono, fechaNacimiento, sexo, procedencia, direccion, estado)
    VALUES (
        @nuevo_alumno + 12,
        @nombre_alumno,
        @apellido_alumno,
        @nivel_alumno,
        @grado_alumno,
        @seccion_alumno,
        CONCAT('80', LPAD(@nuevo_alumno, 6, '0')),
        CONCAT(LOWER(LEFT(@nombre_alumno, 1)), LOWER(@apellido_alumno), '@academiadecam.edu.pe'),
        CONCAT('900', LPAD(@nuevo_alumno, 6, '0')),
        DATE_SUB('2026-10-01', INTERVAL @edad_alumno YEAR),
        IF(MOD(@nuevo_alumno, 2) = 0, 'Femenino', 'Masculino'),
        'Lima, Peru',
        CONCAT('Direccion de prueba ', LPAD(@nuevo_alumno, 4, '0')),
        'activo'
    );
    SET @nuevo_alumno := @nuevo_alumno + 1;
END WHILE;

INSERT IGNORE INTO apoderado (idAlumno, nombre, dni, telefono, correo, observaciones) VALUES
(1, 'Rosa Elena Castillo', '90000001', '900100001', 'apoderado01@example.invalid', NULL),
(2, 'Carlos Alberto Mendoza', '90000002', '900100002', 'apoderado02@example.invalid', 'Contacto de emergencia ficticio.'),
(3, 'María Teresa Torres', '90000003', '900100003', 'apoderado03@example.invalid', NULL),
(4, 'José Luis Quispe', '90000004', '900100004', 'apoderado04@example.invalid', 'Prefiere contacto telefónico (dato de prueba).'),
(5, 'Patricia Flores Paredes', '90000005', '900100005', 'apoderado05@example.invalid', NULL),
(6, 'Miguel Ángel Vargas', '90000006', '900100006', 'apoderado06@example.invalid', NULL),
(7, 'Carmen Rosa Salinas', '90000007', '900100007', 'apoderado07@example.invalid', 'Disponible por la tarde (dato de prueba).'),
(8, 'Javier Fernández Ruiz', '90000008', '900100008', 'apoderado08@example.invalid', NULL),
(9, 'Elena Medina Flores', '90000009', '900100009', 'apoderado09@example.invalid', NULL),
(10, 'Fernando Cruz Paredes', '90000010', '900100010', 'apoderado10@example.invalid', 'Contacto de emergencia ficticio.'),
(11, 'Julia Ríos Mamani', '90000011', '900100011', 'apoderado11@example.invalid', NULL),
(12, 'Andrés Herrera Luna', '90000012', '900100012', 'apoderado12@example.invalid', NULL);

SET @nuevo_alumno := 1;
WHILE @nuevo_alumno <= 120 DO
    INSERT INTO apoderado (idAlumno, nombre, dni, telefono, correo, observaciones)
    VALUES (
        @nuevo_alumno + 12,
        CONCAT('Apoderado ', LPAD(@nuevo_alumno, 4, '0')),
        CONCAT('91', LPAD(@nuevo_alumno, 6, '0')),
        CONCAT('92', LPAD(@nuevo_alumno, 7, '0')),
        CONCAT('apoderado.', LPAD(@nuevo_alumno, 4, '0'), '@example.invalid'),
        'Contacto ficticio de datos demo.'
    );
    SET @nuevo_alumno := @nuevo_alumno + 1;
END WHILE;

INSERT IGNORE INTO curso (nrcCurso, nombreCurso, descripcion, creditos, horasSemanal, estado) VALUES
(1101, 'Matemáticas', 'Pensamiento matemático y resolución de problemas.', 4, 6, 'activo'),
(1102, 'Comunicación', 'Comprensión lectora, expresión oral y escritura.', 3, 5, 'activo'),
(1103, 'Programación', 'Pensamiento computacional y fundamentos de programación.', 4, 5, 'activo'),
(1104, 'Educación Física', 'Actividad física, salud y trabajo en equipo.', 2, 4, 'activo');

INSERT IGNORE INTO docente (idDocente, nombre, apellido, especialidad, correo, telefono, nrcCurso, estado) VALUES
(1, 'Mariana', 'Soto Delgado', 'Matemáticas', 'msoto@acadecam.edu.pe', '976123450', 1101, 'activo'),
(2, 'Jorge', 'Ramirez Ponce', 'Comunicación', 'jramirez@acadecam.edu.pe', '975234601', 1102, 'activo'),
(3, 'Patricia', 'Nunez Cabrera', 'Programación', 'pnunez@acadecam.edu.pe', '974345612', 1103, 'activo'),
(4, 'Ricardo', 'Vega Molina', 'Educación Física', 'rvega@acadecam.edu.pe', '973456123', 1104, 'activo'),
(5, 'Elena', 'Campos Ruiz', 'Matemáticas', 'ecampos@acadecam.edu.pe', '972345614', 1101, 'activo'),
(6, 'Oscar', 'Paredes Silva', 'Comunicación', 'oparedes@acadecam.edu.pe', '971234605', 1102, 'activo'),
(7, 'Lucia', 'Torres Medina', 'Programación', 'ltorres@acadecam.edu.pe', '970123456', 1103, 'activo'),
(8, 'Daniel', 'Rojas Castillo', 'Educación Física', 'drojas@acadecam.edu.pe', '970234567', 1104, 'activo');

SET @nuevo_docente := 1;
WHILE @nuevo_docente <= 10 DO
    INSERT INTO docente (idDocente, nombre, apellido, especialidad, correo, telefono, nrcCurso, estado)
    VALUES (
        @nuevo_docente + 8,
        ELT(@nuevo_docente, 'Adriana', 'Felipe', 'Miriam', 'Esteban', 'Valentina', 'Raul', 'Natalia', 'Hector', 'Paola', 'Ivan'),
        ELT(@nuevo_docente, 'Arce', 'Benavides', 'Campos', 'Del Rio', 'Espinoza', 'Fuentes', 'Guzman', 'Huerta', 'Iriarte', 'Jurado'),
        ELT(MOD(@nuevo_docente - 1, 4) + 1, 'Matemáticas', 'Comunicación', 'Programación', 'Educación Física'),
        CONCAT(
            LOWER(LEFT(ELT(@nuevo_docente, 'Adriana', 'Felipe', 'Miriam', 'Esteban', 'Valentina', 'Raul', 'Natalia', 'Hector', 'Paola', 'Ivan'), 1)),
            REPLACE(LOWER(ELT(@nuevo_docente, 'Arce', 'Benavides', 'Campos', 'Del Rio', 'Espinoza', 'Fuentes', 'Guzman', 'Huerta', 'Iriarte', 'Jurado')), ' ', ''),
            '@acadecam.edu.pe'
        ),
        CONCAT('970', LPAD(300000 + @nuevo_docente, 6, '0')),
        ELT(MOD(@nuevo_docente - 1, 4) + 1, 1101, 1102, 1103, 1104),
        'activo'
    );
    SET @nuevo_docente := @nuevo_docente + 1;
END WHILE;

INSERT IGNORE INTO calificacion (idCalificacion, idAlumno, nrcCurso, tipoEvaluacion, nota, fecha, porcentaje, observacion, estado) VALUES
(1, 1, 1101, 'Practica 1', 18.00, '2026-08-28', 20.00, 'Buen manejo de algoritmos.', 'registrada'),
(2, 1, 1101, 'Parcial', 16.50, '2026-09-12', 30.00, 'Debe reforzar modularidad.', 'registrada'),
(3, 1, 1102, 'Practica 1', 17.00, '2026-09-02', 20.00, 'Consultas correctamente planteadas.', 'registrada'),
(4, 2, 1101, 'Practica 1', 14.00, '2026-08-28', 20.00, 'Revisar ciclos anidados.', 'registrada'),
(5, 2, 1104, 'Avance de proyecto', 17.50, '2026-09-10', 30.00, 'Entrega completa y puntual.', 'registrada'),
(6, 3, 1102, 'Practica 1', 19.00, '2026-09-02', 20.00, 'Excelente modelado relacional.', 'registrada'),
(7, 3, 1102, 'Exposicion', 18.00, '2026-09-05', 25.00, 'Comunicacion clara.', 'registrada'),
(8, 4, 1103, 'Practica 1', 13.50, '2026-08-31', 20.00, 'Requiere asesoria adicional.', 'registrada'),
(9, 5, 1101, 'Parcial', 15.00, '2026-09-12', 30.00, NULL, 'registrada'),
(10, 5, 1103, 'Practica 1', 16.00, '2026-09-09', 20.00, 'Buen uso de indicadores.', 'registrada'),
(11, 6, 1104, 'Control de lectura', 18.50, '2026-08-29', 15.00, NULL, 'registrada'),
(12, 7, 1102, 'Practica de redaccion', 16.50, '2026-09-04', 25.00, NULL, 'registrada'),
(13, 9, 1103, 'Arquitectura', 17.00, '2026-09-06', 20.00, 'Buen diseño de componentes.', 'registrada'),
(14, 9, 1104, 'Control de seguridad', 18.50, '2026-09-08', 25.00, NULL, 'registrada'),
(15, 10, 1103, 'Requisitos', 14.00, '2026-09-07', 20.00, 'Debe completar los casos de uso.', 'registrada'),
(16, 11, 1104, 'Practica de riesgos', 19.00, '2026-09-09', 25.00, 'Excelente identificacion de riesgos.', 'registrada'),
(17, 12, 1103, 'Visualizacion', 15.50, '2026-09-10', 20.00, NULL, 'registrada'),
(18, 12, 1103, 'Limpieza de datos', 16.00, '2026-09-15', 25.00, NULL, 'registrada');

INSERT IGNORE INTO asistencia (idAsistencia, idAlumno, nrcCurso, fecha, hora, estado, observacion, tipoSesion) VALUES
(1, 1, 1101, '2026-09-14', '08:03:00', 'presente', NULL, 'clase'),
(2, 1, 1102, '2026-09-15', '08:01:00', 'presente', NULL, 'clase'),
(3, 1, 1103, '2026-09-16', '11:12:00', 'tardanza', 'Ingreso 12 minutos tarde.', 'clase'),
(4, 2, 1101, '2026-09-14', '08:00:00', 'presente', NULL, 'clase'),
(5, 2, 1104, '2026-09-15', NULL, 'falta', 'Inasistencia sin justificativo.', 'clase'),
(6, 3, 1102, '2026-09-15', '07:58:00', 'presente', NULL, 'clase'),
(7, 3, 1102, '2026-09-18', '08:04:00', 'presente', NULL, 'exposicion'),
(8, 4, 1103, '2026-09-16', '11:00:00', 'presente', NULL, 'clase'),
(9, 5, 1101, '2026-09-14', '08:10:00', 'tardanza', NULL, 'clase'),
(10, 5, 1103, '2026-09-18', '14:00:00', 'presente', NULL, 'laboratorio'),
(11, 6, 1104, '2026-09-15', '14:02:00', 'presente', NULL, 'clase'),
(12, 7, 1102, '2026-09-18', NULL, 'falta', 'Presento justificativo pendiente.', 'clase'),
(13, 9, 1103, '2026-09-17', '16:02:00', 'presente', NULL, 'clase'),
(14, 9, 1104, '2026-09-18', '16:10:00', 'tardanza', NULL, 'clase'),
(15, 10, 1103, '2026-09-17', NULL, 'falta', 'Justificativo pendiente.', 'clase'),
(16, 11, 1104, '2026-09-18', '16:00:00', 'presente', NULL, 'clase'),
(17, 12, 1103, '2026-09-18', '14:02:00', 'presente', NULL, 'laboratorio'),
(18, 12, 1103, '2026-09-19', '14:01:00', 'presente', NULL, 'laboratorio');

INSERT IGNORE INTO reclamo (idReclamo, idAlumno, fecha, motivo, descripcion, estado, fechaAtencion, prioridad) VALUES
(1, 1, '2026-09-03', 'Actualizacion de nota', 'La nota de la practica 1 aun no aparece en el portal.', 'atendido', '2026-09-04', 'normal'),
(2, 3, '2026-09-08', 'Cambio de horario', 'Solicita revisar el cruce con una actividad institucional.', 'en_revision', NULL, 'alta'),
(3, 5, '2026-09-15', 'Constancia de estudios', 'Requiere la constancia para postular a una practica.', 'pendiente', NULL, 'normal'),
(4, 9, '2026-09-17', 'Cambio de sección', 'Solicita cambiar de horario por practicas profesionales.', 'pendiente', NULL, 'alta'),
(5, 10, '2026-09-18', 'Revision de asistencia', 'Solicita revisar una falta registrada durante una clase virtual.', 'en_revision', NULL, 'normal');

INSERT IGNORE INTO respuesta_reclamo (idRespuesta, idReclamo, fecha, respuesta, estado, observacion, responsable) VALUES
(1, 1, '2026-09-04', 'La calificacion fue verificada y ya se encuentra registrada.', 'resuelta', 'Se notifico al alumno por correo.', 'Mesa de ayuda academica'),
(2, 2, '2026-09-10', 'El cambio de horario fue derivado a coordinacion.', 'en_proceso', NULL, 'Coordinacion academica'),
(3, 5, '2026-09-19', 'La asistencia sera revisada con el docente del curso.', 'en_proceso', NULL, 'Mesa de ayuda academica');

INSERT IGNORE INTO pago (idPago, idAlumno, fechaPago, monto, concepto, estado, metodoPago, numeroOperacion, fechaVencimiento, comprobante) VALUES
(1, 1, '2026-08-09', 420.00, 'Matricula 2026-II', 'pagado', 'transferencia', 'TRX-20260809-001', '2026-08-12', 'COMP-0001'),
(2, 2, '2026-08-11', 420.00, 'Matricula 2026-II', 'pagado', 'tarjeta', 'POS-20260811-014', '2026-08-12', 'COMP-0002'),
(3, 3, NULL, 180.00, 'Cuota septiembre 2026', 'pendiente', NULL, NULL, '2026-09-20', NULL),
(4, 4, '2026-08-12', 420.00, 'Matricula 2026-II', 'pagado', 'yape', 'YAP-20260812-882', '2026-08-12', 'COMP-0003'),
(5, 5, '2026-08-13', 420.00, 'Matricula 2026-II', 'pagado', 'transferencia', 'TRX-20260813-027', '2026-08-14', 'COMP-0004'),
(6, 6, NULL, 180.00, 'Cuota septiembre 2026', 'vencido', NULL, NULL, '2026-09-10', NULL),
(7, 7, '2026-08-14', 420.00, 'Matricula 2026-II', 'pagado', 'tarjeta', 'POS-20260814-031', '2026-08-15', 'COMP-0005'),
(8, 9, '2026-08-15', 420.00, 'Matricula 2026-II', 'pagado', 'transferencia', 'TRX-20260815-043', '2026-08-16', 'COMP-0006'),
(9, 10, NULL, 180.00, 'Cuota septiembre 2026', 'pendiente', NULL, NULL, '2026-09-20', NULL),
(10, 11, '2026-08-16', 420.00, 'Matricula 2026-II', 'pagado', 'yape', 'YAP-20260816-125', '2026-08-17', 'COMP-0007');

INSERT IGNORE INTO constancia (idConstancia, idAlumno, tipo, fechaEmision, estado, numeroConstancia, fechaSolicitud, observacion, formato) VALUES
(1, 1, 'Constancia de estudios', '2026-09-05', 'emitida', 'CE-2026-0001', '2026-09-03', 'Disponible para descarga.', 'PDF'),
(2, 3, 'Constancia de matricula', NULL, 'en_proceso', NULL, '2026-09-08', 'Pendiente de validacion administrativa.', 'PDF'),
(3, 5, 'Constancia de estudios', NULL, 'solicitada', NULL, '2026-09-15', NULL, 'PDF'),
(4, 7, 'Record academico', '2026-09-02', 'emitida', 'RA-2026-0004', '2026-08-30', NULL, 'PDF'),
(5, 9, 'Constancia de estudios', NULL, 'solicitada', NULL, '2026-09-17', 'Pendiente de validacion.', 'PDF'),
(6, 10, 'Constancia de matricula', '2026-09-20', 'emitida', 'CM-2026-0006', '2026-09-18', NULL, 'PDF');

INSERT IGNORE INTO usuario (idUsuario, correo, contrasena, nombre, rol, idAlumno, idDocente, estado) VALUES
(1, 'prof@acadecam.edu.pe', 'scrypt$74dedd7e3fef4237556e98de1f5e4f0a$c67683571abc4a977d230d1e7f6a621908868dd9a7a59f535d3bcca0d52d93066f1c15364a188cc707e7e4c396c6274efa5cba0d4e3a64500c0aa5a6c5a71374', 'Profesor Demo', 'teacher', NULL, 1, 'activo'),
(2, 'alumno@acadecam.edu.pe', 'scrypt$679b23a562e7bdb4a4a4903878e29bc6$ee19060219f0791b5f2fdd24de82bb5f45c9985c5800668566d92eb2d0cf0bd212ce589e5339b25f6c1d405da43a61895a037ecca7daa506502e22495df9090a', 'Alumno Demo', 'student', 1, NULL, 'activo'),
(3, 'jefe@acadecam.edu.pe', 'scrypt$d2261a053b8b5db9d84ff928da5ac97f$a56bb591f5467bccc0cff0fdc9dd83e8453f006c2eb18f139717f0265f55337b56889d5a21495ccdf473440b371578159d3f089f11d201ecc7dab22edaac154e', 'Jefe Academico', 'jefe', NULL, NULL, 'activo'),
(4, 'registrador@acadecam.edu.pe', 'scrypt$aa8e6a86f974f95898ed5611d7bf3411$7aa9c342e027d16482833db2142f21d19178b70f31bc45df81cdf3f5daa4be6d213814df1db3e97db42d447a2e311f383063de0b1b5ee45c90461320f3b8a0b3', 'Registrador', 'registrador', NULL, NULL, 'activo');

SET @clave_inicial := 'scrypt$2440792dbd71407ab550d9305ad4160b$c93d0dc3b94bd094d6142b1c3ae2a6d6a8e5bbbb9ce26dda9a0bfe72a282c1476b9d5f321ad778da400541d345d65ec5c93c67662b4a95838006b272a4453f2a';
SET @nuevo_alumno := 1;
WHILE @nuevo_alumno <= 120 DO
    SET @nombre_alumno := ELT(
        MOD(@nuevo_alumno - 1, 12) + 1,
        'Ana', 'Luis', 'Mia', 'Carlos', 'Teresa', 'Pedro',
        'Sofia', 'Diego', 'Elena', 'Victor', 'Ximena', 'Rafael'
    );
    SET @apellido_alumno := ELT(
        FLOOR((@nuevo_alumno - 1) / 12) + 1,
        'Alvarez', 'Benitez', 'Campos', 'Delgado', 'Espinoza',
        'Flores', 'Garcia', 'Herrera', 'Ibarra', 'Jimenez'
    );
    INSERT INTO usuario (correo, contrasena, nombre, rol, idAlumno, estado, debeCambiarContrasena)
    VALUES (
        CONCAT(LOWER(LEFT(@nombre_alumno, 1)), LOWER(@apellido_alumno), '@academiadecam.edu.pe'),
        @clave_inicial,
        CONCAT(@nombre_alumno, ' ', @apellido_alumno),
        'student',
        @nuevo_alumno + 12,
        'activo',
        1
    );
    SET @nuevo_alumno := @nuevo_alumno + 1;
END WHILE;

SET @nuevo_docente := 1;
WHILE @nuevo_docente <= 10 DO
    SET @nombre_docente := ELT(
        @nuevo_docente,
        'Adriana', 'Felipe', 'Miriam', 'Esteban', 'Valentina',
        'Raul', 'Natalia', 'Hector', 'Paola', 'Ivan'
    );
    SET @apellido_docente := ELT(
        @nuevo_docente,
        'Arce', 'Benavides', 'Campos', 'Del Rio', 'Espinoza',
        'Fuentes', 'Guzman', 'Huerta', 'Iriarte', 'Jurado'
    );
    INSERT INTO usuario (correo, contrasena, nombre, rol, idDocente, estado, debeCambiarContrasena)
    VALUES (
        CONCAT(LOWER(LEFT(@nombre_docente, 1)), REPLACE(LOWER(@apellido_docente), ' ', ''), '@acadecam.edu.pe'),
        @clave_inicial,
        CONCAT(@nombre_docente, ' ', @apellido_docente),
        'teacher',
        @nuevo_docente + 8,
        'activo',
        1
    );
    SET @nuevo_docente := @nuevo_docente + 1;
END WHILE;

INSERT INTO usuario (correo, contrasena, nombre, rol, estado, debeCambiarContrasena) VALUES
('gmendoza@acadecam.edu.pe', @clave_inicial, 'Gabriela Mendoza', 'jefe', 'activo', 1),
('rponce@acadecam.edu.pe', @clave_inicial, 'Ricardo Ponce', 'jefe', 'activo', 1),
('lsalas@acadecam.edu.pe', @clave_inicial, 'Laura Salas', 'registrador', 'activo', 1),
('mcabrera@acadecam.edu.pe', @clave_inicial, 'Martin Cabrera', 'registrador', 'activo', 1),
('ptorres@acadecam.edu.pe', @clave_inicial, 'Pilar Torres', 'registrador', 'activo', 1),
('dvega@acadecam.edu.pe', @clave_inicial, 'Diego Vega', 'registrador', 'activo', 1);

INSERT IGNORE INTO tarea (idTarea, titulo, nrcCurso, fechaAsignacion, fechaEntrega, tipo, estado, color) VALUES
(1, 'Lectura y comprensión de textos', 1102, '2026-09-10', '2026-09-25', 'Proyecto', 'pendiente', '#4F46E5'),
(2, 'Producción de textos breves', 1102, '2026-09-05', '2026-09-18', 'Tarea', 'atrasada', '#F59E0B'),
(3, 'Algoritmos y secuencias', 1103, '2026-09-01', '2026-09-12', 'Informe', 'entregada', '#10B981'),
(4, 'Razonamiento matemático', 1101, '2026-09-16', '2026-09-29', 'Practica', 'pendiente', '#14B8A6');

END IF;
END$$
DELIMITER ;

CALL tc10_insertar_datos_demo();
DROP PROCEDURE tc10_insertar_datos_demo;

-- =============================================================
-- CREACION DE EXTENSIONES ACADEMICAS PARA EL ESQUEMA DE PRUEBA
-- =============================================================

ALTER TABLE apoderado
    MODIFY COLUMN dni VARCHAR(15) NULL,
    MODIFY COLUMN correo VARCHAR(150) NULL;

CREATE TABLE IF NOT EXISTS anio_academico (
    periodoAcademico VARCHAR(20) NOT NULL,
    estado ENUM('activo', 'cerrado') NOT NULL DEFAULT 'activo',
    fechaInicio DATE NULL,
    fechaFin DATE NULL,
    PRIMARY KEY (periodoAcademico)
) ENGINE=InnoDB;

INSERT INTO anio_academico (periodoAcademico, estado, fechaInicio, fechaFin)
VALUES ('2026-II', 'activo', '2026-08-01', '2026-12-31');

ALTER TABLE matricula
    ADD CONSTRAINT fk_matricula_periodo FOREIGN KEY (periodoAcademico)
        REFERENCES anio_academico (periodoAcademico)
        ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS asignacion_docente (
    idAsignacion INT NOT NULL AUTO_INCREMENT,
    idDocente INT NOT NULL,
    nrcCurso INT NOT NULL,
    nivel ENUM('primaria', 'secundaria') NOT NULL,
    grado TINYINT UNSIGNED NOT NULL,
    seccion ENUM('A', 'B', 'C') NOT NULL,
    periodoAcademico VARCHAR(20) NOT NULL,
    estado ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
    PRIMARY KEY (idAsignacion),
    UNIQUE KEY uq_asignacion_oferta (nrcCurso, nivel, grado, seccion, periodoAcademico),
    KEY idx_asignacion_docente (idDocente, nrcCurso),
    KEY idx_asignacion_ubicacion_periodo (nivel, grado, seccion, periodoAcademico),
    CONSTRAINT fk_asignacion_docente_curso FOREIGN KEY (idDocente, nrcCurso)
        REFERENCES docente (idDocente, nrcCurso)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_asignacion_docente_periodo FOREIGN KEY (periodoAcademico)
        REFERENCES anio_academico (periodoAcademico)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_asignacion_grado CHECK (
        (nivel = 'primaria' AND grado BETWEEN 1 AND 6) OR
        (nivel = 'secundaria' AND grado BETWEEN 1 AND 5)
    )
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS tc10_generar_ofertas_demo;
DELIMITER $$
CREATE PROCEDURE tc10_generar_ofertas_demo()
BEGIN
    SET @indice_seccion := 0;
    WHILE @indice_seccion < 33 DO
        SET @nivel_oferta := IF(@indice_seccion < 18, 'primaria', 'secundaria');
        SET @grado_oferta := IF(
            @indice_seccion < 18,
            FLOOR(@indice_seccion / 3) + 1,
            FLOOR((@indice_seccion - 18) / 3) + 1
        );
        SET @seccion_oferta := ELT(MOD(@indice_seccion, 3) + 1, 'A', 'B', 'C');
        SET @indice_curso := 1;
        WHILE @indice_curso <= 4 DO
            SET @curso_oferta := 1100 + @indice_curso;
            SET @cantidad_docentes_curso := IF(@indice_curso <= 2, 5, 4);
            SET @docente_oferta := @indice_curso
                + 4 * MOD(@indice_seccion, @cantidad_docentes_curso);
            INSERT INTO asignacion_docente
                (idDocente, nrcCurso, nivel, grado, seccion, periodoAcademico)
            VALUES (
                @docente_oferta,
                @curso_oferta,
                @nivel_oferta,
                @grado_oferta,
                @seccion_oferta,
                '2026-II'
            );
            SET @indice_curso := @indice_curso + 1;
        END WHILE;
        SET @indice_seccion := @indice_seccion + 1;
    END WHILE;
END$$
DELIMITER ;
CALL tc10_generar_ofertas_demo();
DROP PROCEDURE tc10_generar_ofertas_demo;

INSERT INTO matricula
    (idAlumno, nrcCurso, fecha, periodoAcademico, nivel, grado, seccion, estado, modalidad, fechaRegistro)
SELECT
    a.idAlumno,
    c.nrcCurso,
    '2026-08-10',
    '2026-II',
    a.nivel,
    a.grado,
    a.seccion,
    'activa',
    'presencial',
    '2026-08-08 09:15:00'
FROM alumno a
CROSS JOIN curso c
WHERE a.idAlumno BETWEEN 1 AND 122;

UPDATE usuario
SET debeCambiarContrasena = 0
WHERE correo IN (
    'prof@acadecam.edu.pe',
    'alumno@acadecam.edu.pe',
    'jefe@acadecam.edu.pe',
    'registrador@acadecam.edu.pe'
);

ALTER TABLE calificacion
    ADD COLUMN idDocente INT NULL,
    ADD COLUMN periodoAcademico VARCHAR(20) NULL,
    ADD KEY idx_calificacion_docente_periodo (idDocente, periodoAcademico, nrcCurso),
    ADD UNIQUE KEY uq_calificacion_alumno_curso_tipo_docente_periodo
        (idAlumno, nrcCurso, tipoEvaluacion, idDocente, periodoAcademico),
    ADD CONSTRAINT fk_calificacion_docente FOREIGN KEY (idDocente)
        REFERENCES docente (idDocente)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_calificacion_periodo FOREIGN KEY (periodoAcademico)
        REFERENCES anio_academico (periodoAcademico)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE asistencia
    ADD COLUMN idDocente INT NULL,
    ADD COLUMN periodoAcademico VARCHAR(20) NULL,
    ADD KEY idx_asistencia_docente_periodo (idDocente, periodoAcademico, nrcCurso),
    ADD CONSTRAINT fk_asistencia_docente FOREIGN KEY (idDocente)
        REFERENCES docente (idDocente)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_asistencia_periodo FOREIGN KEY (periodoAcademico)
        REFERENCES anio_academico (periodoAcademico)
        ON UPDATE CASCADE ON DELETE RESTRICT;

UPDATE calificacion cal
INNER JOIN matricula m
    ON m.idAlumno = cal.idAlumno
   AND m.nrcCurso = cal.nrcCurso
   AND YEAR(m.fecha) = YEAR(cal.fecha)
INNER JOIN asignacion_docente ad
    ON ad.nrcCurso = m.nrcCurso
   AND ad.nivel = m.nivel
   AND ad.grado = m.grado
   AND ad.seccion = m.seccion
   AND ad.periodoAcademico = m.periodoAcademico
   AND ad.estado = 'activa'
SET cal.idDocente = ad.idDocente,
    cal.periodoAcademico = ad.periodoAcademico
WHERE cal.idDocente IS NULL
  AND cal.periodoAcademico IS NULL;

UPDATE asistencia att
INNER JOIN matricula m
    ON m.idAlumno = att.idAlumno
   AND m.nrcCurso = att.nrcCurso
   AND YEAR(m.fecha) = YEAR(att.fecha)
INNER JOIN asignacion_docente ad
    ON ad.nrcCurso = m.nrcCurso
   AND ad.nivel = m.nivel
   AND ad.grado = m.grado
   AND ad.seccion = m.seccion
   AND ad.periodoAcademico = m.periodoAcademico
   AND ad.estado = 'activa'
SET att.idDocente = ad.idDocente,
    att.periodoAcademico = ad.periodoAcademico
WHERE att.idDocente IS NULL
  AND att.periodoAcademico IS NULL;

CREATE TABLE IF NOT EXISTS promedio (
    idPromedio INT NOT NULL AUTO_INCREMENT,
    idAlumno INT NOT NULL,
    nrcCurso INT NOT NULL,
    idDocente INT NOT NULL,
    periodoAcademico VARCHAR(20) NOT NULL,
    promedio DECIMAL(5,2) NOT NULL,
    actualizadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (idPromedio),
    UNIQUE KEY uq_promedio_alumno_curso_docente_periodo
        (idAlumno, nrcCurso, idDocente, periodoAcademico),
    CONSTRAINT fk_promedio_alumno FOREIGN KEY (idAlumno)
        REFERENCES alumno (idAlumno)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_promedio_curso FOREIGN KEY (nrcCurso)
        REFERENCES curso (nrcCurso)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_promedio_docente FOREIGN KEY (idDocente)
        REFERENCES docente (idDocente)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_promedio_periodo FOREIGN KEY (periodoAcademico)
        REFERENCES anio_academico (periodoAcademico)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_promedio_rango CHECK (promedio >= 0 AND promedio <= 20)
) ENGINE=InnoDB;

INSERT INTO promedio (idAlumno, nrcCurso, idDocente, periodoAcademico, promedio)
SELECT idAlumno, nrcCurso, idDocente, periodoAcademico, ROUND(AVG(nota), 2)
FROM calificacion
WHERE idDocente IS NOT NULL AND periodoAcademico IS NOT NULL
GROUP BY idAlumno, nrcCurso, idDocente, periodoAcademico
ON DUPLICATE KEY UPDATE promedio = VALUES(promedio);
