const ESTADOS_ASISTENCIA = new Set(['presente', 'falta', 'tardanza']);

async function listarAsignaciones(pool, session) {
  const [rows] = await pool.query(
    `SELECT ad.idAsignacion, ad.idDocente, ad.nrcCurso, ad.grupo,
            ad.periodoAcademico, c.nombreCurso
     FROM asignacion_docente ad
     INNER JOIN curso c ON c.nrcCurso = ad.nrcCurso
     WHERE ad.estado = 'activa'
       AND (? = 'jefe' OR ad.idDocente = ?)
     ORDER BY ad.periodoAcademico DESC, ad.grupo, c.nombreCurso`,
    [session.role, session.idDocente || 0]
  );
  return rows;
}

async function obtenerListaAsignacion(pool, session, idAsignacion, fecha) {
  const [rows] = await pool.query(
    `SELECT ad.idAsignacion, ad.nrcCurso, ad.grupo, ad.periodoAcademico,
            c.nombreCurso, a.idAlumno, a.nombre, a.apellido,
            COALESCE(asx.estado, '') AS estadoAsistencia
     FROM asignacion_docente ad
     INNER JOIN curso c ON c.nrcCurso = ad.nrcCurso
     INNER JOIN matricula m
       ON m.nrcCurso = ad.nrcCurso
      AND m.periodoAcademico = ad.periodoAcademico
      AND m.estado = 'activa'
     INNER JOIN alumno a
       ON a.idAlumno = m.idAlumno
      AND m.grupo = ad.grupo
     LEFT JOIN asistencia asx
       ON asx.idAlumno = a.idAlumno
      AND asx.nrcCurso = ad.nrcCurso
      AND asx.fecha = ?
      AND asx.idDocente = ad.idDocente
      AND asx.periodoAcademico = ad.periodoAcademico
     WHERE ad.idAsignacion = ?
       AND ad.idDocente = ?
       AND ad.estado = 'activa'
     ORDER BY a.apellido, a.nombre`,
    [fecha, idAsignacion, session.idDocente]
  );
  return rows;
}

async function obtenerHistorialAsistencia(pool, session, idAsignacion) {
  const [rows] = await pool.query(
    `SELECT asx.*, a.nombre, a.apellido, c.nombreCurso
     FROM asignacion_docente ad
     INNER JOIN asistencia asx
       ON asx.nrcCurso = ad.nrcCurso
      AND asx.periodoAcademico = ad.periodoAcademico
      AND asx.idDocente = ad.idDocente
     INNER JOIN matricula m
       ON m.idAlumno = asx.idAlumno
      AND m.nrcCurso = ad.nrcCurso
      AND m.periodoAcademico = ad.periodoAcademico
      AND m.grupo = ad.grupo
     INNER JOIN alumno a
       ON a.idAlumno = asx.idAlumno
     INNER JOIN curso c ON c.nrcCurso = ad.nrcCurso
     WHERE ad.idAsignacion = ?
       AND ad.idDocente = ?
       AND ad.estado = 'activa'
     ORDER BY asx.fecha DESC, a.apellido, a.nombre`,
    [idAsignacion, session.idDocente]
  );
  return rows;
}

async function obtenerCalificacionesAsignacion(pool, session, idAsignacion) {
  const [rows] = await pool.query(
    `SELECT m.idAlumno, a.nombre, a.apellido, m.grupo,
            c.nrcCurso, c.nombreCurso, ad.periodoAcademico,
            cal.idCalificacion, cal.tipoEvaluacion, cal.nota,
            p.promedio
     FROM asignacion_docente ad
     INNER JOIN matricula m
       ON m.nrcCurso = ad.nrcCurso
      AND m.periodoAcademico = ad.periodoAcademico
      AND m.estado = 'activa'
     INNER JOIN alumno a
       ON a.idAlumno = m.idAlumno
      AND m.grupo = ad.grupo
     INNER JOIN curso c ON c.nrcCurso = ad.nrcCurso
     LEFT JOIN calificacion cal
       ON cal.idAlumno = m.idAlumno
      AND cal.nrcCurso = ad.nrcCurso
      AND cal.idDocente = ad.idDocente
      AND cal.periodoAcademico = ad.periodoAcademico
     LEFT JOIN promedio p
       ON p.idAlumno = m.idAlumno
      AND p.nrcCurso = ad.nrcCurso
      AND p.idDocente = ad.idDocente
      AND p.periodoAcademico = ad.periodoAcademico
     WHERE ad.idAsignacion = ?
       AND ad.idDocente = ?
       AND ad.estado = 'activa'
     ORDER BY a.apellido, a.nombre, cal.fecha, cal.idCalificacion`,
    [idAsignacion, session.idDocente]
  );
  return rows;
}

async function verificarAlumnoAsignado(connection, session, assignment, studentId) {
  const [rows] = await connection.query(
    `SELECT ad.idAsignacion
     FROM asignacion_docente ad
     INNER JOIN matricula m
       ON m.nrcCurso = ad.nrcCurso
      AND m.periodoAcademico = ad.periodoAcademico
      AND m.estado = 'activa'
     INNER JOIN alumno a
       ON a.idAlumno = m.idAlumno
      AND m.grupo = ad.grupo
     WHERE ad.idAsignacion = ?
       AND ad.idDocente = ?
       AND m.idAlumno = ?
       AND ad.estado = 'activa'
     LIMIT 1`,
    [assignment.idAsignacion, session.idDocente, studentId]
  );
  return rows.length > 0;
}

async function guardarAsistencias(pool, session, data) {
  if (!data || !Number.isInteger(Number(data.idAsignacion)) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(data.fecha || '')) ||
      !Array.isArray(data.registros) || !data.registros.length) {
    return {status: 400, error: 'Selecciona una asignación, fecha y al menos un alumno.'};
  }
  const fecha = String(data.fecha);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [assignments] = await connection.query(
      `SELECT idAsignacion, idDocente, nrcCurso, periodoAcademico
       FROM asignacion_docente
       WHERE idAsignacion = ? AND idDocente = ? AND estado = 'activa'
       FOR UPDATE`,
      [Number(data.idAsignacion), session.idDocente]
    );
    const assignment = assignments[0];
    if (!assignment) {
      await connection.rollback();
      return {status: 403, error: 'La asignación no pertenece a este docente.'};
    }

    for (const record of data.registros) {
      const studentId = Number(record.idAlumno);
      const status = String(record.estado || '');
      if (!Number.isInteger(studentId) || !ESTADOS_ASISTENCIA.has(status)) {
        await connection.rollback();
        return {status: 400, error: 'Cada alumno debe tener un estado de asistencia válido.'};
      }
      if (!(await verificarAlumnoAsignado(connection, session, assignment, studentId))) {
        await connection.rollback();
        return {status: 403, error: 'El alumno no pertenece a la asignación seleccionada.'};
      }
      const [existing] = await connection.query(
        `SELECT idDocente FROM asistencia
         WHERE idAlumno = ? AND nrcCurso = ? AND fecha = ?
         FOR UPDATE`,
        [studentId, assignment.nrcCurso, fecha]
      );
      if (existing.length && existing[0].idDocente &&
          existing[0].idDocente !== session.idDocente) {
        await connection.rollback();
        return {status: 403, error: 'No puedes modificar la asistencia registrada por otro docente.'};
      }
      await connection.query(
        `INSERT INTO asistencia
           (idAlumno, nrcCurso, fecha, estado, idDocente, periodoAcademico)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           estado = VALUES(estado), idDocente = VALUES(idDocente),
           periodoAcademico = VALUES(periodoAcademico)`,
        [studentId, assignment.nrcCurso, fecha, status, session.idDocente, assignment.periodoAcademico]
      );
    }
    await connection.commit();
    return {guardados: data.registros.length};
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function guardarCalificaciones(pool, session, data) {
  if (!data || !Number.isInteger(Number(data.idAsignacion)) ||
      !Array.isArray(data.registros) || !data.registros.length) {
    return {status: 400, error: 'Selecciona una asignación y al menos una calificación.'};
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [assignments] = await connection.query(
      `SELECT idAsignacion, idDocente, nrcCurso, periodoAcademico
       FROM asignacion_docente
       WHERE idAsignacion = ? AND idDocente = ? AND estado = 'activa'
       FOR UPDATE`,
      [Number(data.idAsignacion), session.idDocente]
    );
    const assignment = assignments[0];
    if (!assignment) {
      await connection.rollback();
      return {status: 403, error: 'La asignación no pertenece a este docente.'};
    }
    const updatedAverages = [];
    for (const record of data.registros) {
      const studentId = Number(record.idAlumno);
      const type = String(record.tipoEvaluacion || '').trim();
      const grade = Number(record.nota);
      if (!Number.isInteger(studentId) || !type || type.length > 50 ||
          !Number.isFinite(grade) || grade < 0 || grade > 20) {
        await connection.rollback();
        return {status: 400, error: 'Las notas deben tener un tipo válido y estar entre 0 y 20.'};
      }
      if (!(await verificarAlumnoAsignado(connection, session, assignment, studentId))) {
        await connection.rollback();
        return {status: 403, error: 'El alumno no pertenece a la asignación seleccionada.'};
      }
      const [existing] = await connection.query(
        `SELECT idCalificacion
         FROM calificacion
         WHERE idAlumno = ? AND nrcCurso = ? AND idDocente = ?
           AND periodoAcademico = ? AND tipoEvaluacion = ?
         LIMIT 1 FOR UPDATE`,
        [studentId, assignment.nrcCurso, session.idDocente, assignment.periodoAcademico, type]
      );
      if (existing.length) {
        await connection.query(
          'UPDATE calificacion SET nota = ?, fecha = CURRENT_DATE() WHERE idCalificacion = ?',
          [grade, existing[0].idCalificacion]
        );
      } else {
        await connection.query(
          `INSERT INTO calificacion
             (idAlumno, nrcCurso, tipoEvaluacion, nota, fecha, idDocente, periodoAcademico)
           VALUES (?, ?, ?, ?, CURRENT_DATE(), ?, ?)`,
          [studentId, assignment.nrcCurso, type, grade, session.idDocente, assignment.periodoAcademico]
        );
      }
      const [averageRows] = await connection.query(
        `SELECT ROUND(AVG(nota), 2) AS promedio
         FROM calificacion
         WHERE idAlumno = ? AND nrcCurso = ? AND idDocente = ? AND periodoAcademico = ?`,
        [studentId, assignment.nrcCurso, session.idDocente, assignment.periodoAcademico]
      );
      const average = Number(averageRows[0].promedio);
      await connection.query(
        `INSERT INTO promedio (idAlumno, nrcCurso, idDocente, periodoAcademico, promedio)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE promedio = VALUES(promedio)`,
        [studentId, assignment.nrcCurso, session.idDocente, assignment.periodoAcademico, average]
      );
      updatedAverages.push({idAlumno: studentId, promedio: average});
    }
    await connection.commit();
    return {promedios: updatedAverages};
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function registrarMatricula(pool, data) {
  const studentId = Number(data && data.idAlumno);
  const group = String(data && data.grupo || '');
  const period = String(data && data.periodoAcademico || '');
  const courses = data && data.cursos;
  const modality = String(data && data.modalidad || 'presencial').trim();
  if (!Number.isInteger(studentId) || studentId <= 0 ||
      !/^[AB][1-6]$/.test(group) || !/^\d{4}-(I|II)$/.test(period) ||
      !Array.isArray(courses) || !courses.length || modality.length > 30) {
    return {status: 400, error: 'Selecciona alumno, cursos, grado, modalidad y periodo académico válidos.'};
  }
  const courseIds = courses.map(Number);
  if (courseIds.some(id => !Number.isInteger(id) || id <= 0) ||
      new Set(courseIds).size !== courseIds.length) {
    return {status: 400, error: 'La lista de cursos contiene códigos inválidos o repetidos.'};
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [students] = await connection.query(
      'SELECT idAlumno FROM alumno WHERE idAlumno = ? FOR UPDATE',
      [studentId]
    );
    if (!students.length) {
      await connection.rollback();
      return {status: 404, error: 'El alumno seleccionado no existe.'};
    }
    const [periods] = await connection.query(
      'SELECT periodoAcademico FROM anio_academico WHERE periodoAcademico = ?',
      [period]
    );
    if (!periods.length) {
      await connection.rollback();
      return {status: 400, error: 'El periodo académico seleccionado no está registrado.'};
    }
    const courseMarks = courseIds.map(() => '?').join(', ');
    const [registeredCourses] = await connection.query(
      `SELECT nrcCurso FROM curso WHERE nrcCurso IN (${courseMarks})`,
      courseIds
    );
    if (registeredCourses.length !== courseIds.length) {
      await connection.rollback();
      return {status: 400, error: 'Uno o más cursos seleccionados no existen.'};
    }

    await connection.query('UPDATE alumno SET grupo = ? WHERE idAlumno = ?', [group, studentId]);
    const enrollments = [];
    for (const courseId of courseIds) {
      const [result] = await connection.query(
        `INSERT INTO matricula
           (idAlumno, nrcCurso, fecha, periodoAcademico, grupo, estado, modalidad)
         VALUES (?, ?, CURRENT_DATE(), ?, ?, 'activa', ?)`,
        [studentId, courseId, period, group, modality]
      );
      enrollments.push({id: result.insertId, idAlumno: studentId, nrcCurso: courseId, grupo: group, periodoAcademico: period});
    }
    await connection.commit();
    return {matriculas: enrollments};
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return {status: 409, error: 'El alumno ya tiene matrícula en uno de los cursos y periodos seleccionados.'};
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return {status: 400, error: 'El alumno o curso relacionado no existe.'};
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listarAsignaciones,
  obtenerListaAsignacion,
  obtenerHistorialAsistencia,
  obtenerCalificacionesAsignacion,
  guardarAsistencias,
  guardarCalificaciones,
  registrarMatricula
};
