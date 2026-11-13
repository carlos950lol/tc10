const { validarAlumno } = require('../validaciones/alumno');

async function registrarAlumno(pool, alumno) {
  const validation = validarAlumno(alumno);
  if (validation.error) return { status: 400, error: validation.error };

  const data = validation.value;
  try {
    const [existing] = await pool.query(
      'SELECT idAlumno FROM alumno WHERE dni = ? LIMIT 1',
      [data.dni]
    );
    if (existing.length) {
      return { status: 409, error: 'Ya existe un alumno registrado con ese DNI.' };
    }

    const [result] = await pool.query(
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
    return { id: result.insertId };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const errorDni = String(error.message || '').includes('uq_alumno_dni');
      return {
        status: 409,
        error: errorDni
          ? 'Ya existe un alumno registrado con ese DNI.'
          : 'El correo del alumno ya está registrado.'
      };
    }
    throw error;
  }
}

module.exports = { registrarAlumno };
