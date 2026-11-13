function validarAlumno(alumno) {
  if (!alumno || typeof alumno !== 'object' || Array.isArray(alumno)) {
    return { error: 'Los datos del alumno no son válidos.' };
  }

  const nombre = String(alumno.nombre || '').trim();
  const apellido = String(alumno.apellido || '').trim();
  const dni = String(alumno.dni || '').trim();

  if (!nombre) return { error: 'Los nombres son obligatorios.' };
  if (!apellido) return { error: 'Los apellidos son obligatorios.' };
  if (!/^\d{8}$/.test(dni)) {
    return { error: 'El DNI debe contener exactamente 8 dígitos.' };
  }

  const grupo = alumno.grupo == null ? null : String(alumno.grupo).trim();
  if (grupo && !/^[AB][1-6]$/.test(grupo)) {
    return { error: 'El grupo debe tener un formato válido (A1-B6).' };
  }

  return { value: { ...alumno, nombre, apellido, dni, grupo: grupo || null } };
}

module.exports = { validarAlumno };
