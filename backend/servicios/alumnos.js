const { validarAlumno } = require('../validaciones/alumno');

async function registrarAlumno(pool, alumno) {
  const validation = validarAlumno(alumno);
  if (validation.error) return { status: 400, error: validation.error };

  const data = validation.value;
  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.query(
      'SELECT idAlumno FROM alumno WHERE dni = ? LIMIT 1',
      [data.dni]
    );
    if (existing.length) {
      return { status: 409, error: 'Ya existe un alumno registrado con ese DNI.' };
    }

    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO alumno
        (nombre, apellido, grupo, dni, correo, telefono, fechaNacimiento, sexo, procedencia, direccion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        data.apellido,
        data.grupo,
        data.dni,
        data.correo || null,
        data.telefono || null,
        data.fechaNacimiento || null,
        data.sexo || null,
        data.procedencia || null,
        data.direccion || null
      ]
    );
    await connection.query(
      `INSERT INTO apoderado (idAlumno, nombre, dni, telefono, correo, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        data.apoderadoNombre,
        data.apoderadoDni,
        data.apoderadoTelefono,
        alumno.apoderadoCorreo || null,
        alumno.apoderadoObservaciones || null
      ]
    );
    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const message = String(error.message || '');
      const errorDni = message.includes('uq_alumno_dni');
      const apoderadoDniDuplicado = message.includes('uq_apoderado_dni');
      return {
        status: 409,
        error: errorDni
          ? 'Ya existe un alumno registrado con ese DNI.'
          : apoderadoDniDuplicado
            ? 'El DNI del apoderado ya está registrado.'
            : 'El correo del alumno ya está registrado.'
      };
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { registrarAlumno };
