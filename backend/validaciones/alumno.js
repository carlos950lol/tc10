function cumpleEdadEscolar(fechaNacimiento, nivel, grado, fechaReferencia = new Date()) {
  const [year, month, day] = String(fechaNacimiento || '').split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime()) || birth.getFullYear() !== year ||
      birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return false;
  }
  const currentAge = fechaReferencia.getFullYear() - year -
    (fechaReferencia.getMonth() < month - 1 ||
      (fechaReferencia.getMonth() === month - 1 && fechaReferencia.getDate() < day) ? 1 : 0);
  const expectedAge = nivel === 'primaria' ? grado + 5 : grado + 11;
  return currentAge >= expectedAge && currentAge <= expectedAge + 1;
}

function validarAlumno(alumno) {
  if (!alumno || typeof alumno !== 'object' || Array.isArray(alumno)) {
    return { error: 'Los datos del alumno no son válidos.' };
  }

  const nombre = String(alumno.nombre || '').trim();
  const apellido = String(alumno.apellido || '').trim();
  const dni = String(alumno.dni || '').trim();
  const telefono = String(alumno.telefono || '').trim();
  const fechaNacimiento = String(alumno.fechaNacimiento || '').trim();
  const nivel = String(alumno.nivel || '').trim();
  const grado = Number(alumno.grado);
  const seccion = String(alumno.seccion || '').trim();
  const apoderadoNombre = String(alumno.apoderadoNombre || '').trim();
  const apoderadoDni = String(alumno.apoderadoDni || '').trim();
  const apoderadoTelefono = String(alumno.apoderadoTelefono || '').trim();

  if (!nombre) return { error: 'Los nombres son obligatorios.' };
  if (!apellido) return { error: 'Los apellidos son obligatorios.' };
  if (!/^\d{8}$/.test(dni)) {
    return { error: 'El DNI debe contener exactamente 8 dígitos.' };
  }
  if (telefono && !/^\d{9}$/.test(telefono)) {
    return { error: 'El teléfono del alumno debe contener exactamente 9 dígitos.' };
  }
  if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    return { error: 'La fecha de nacimiento es obligatoria y debe ser válida.' };
  }
  const [year, month, day] = fechaNacimiento.split('-').map(Number);
  const nacimiento = new Date(year, month - 1, day);
  if (Number.isNaN(nacimiento.getTime()) || nacimiento.getFullYear() !== year ||
      nacimiento.getMonth() !== month - 1 || nacimiento.getDate() !== day) {
    return { error: 'La fecha de nacimiento no es válida.' };
  }
  if (!apoderadoNombre) return { error: 'Los nombres y apellidos del apoderado son obligatorios.' };
  if (!/^\d{9}$/.test(apoderadoTelefono)) {
    return { error: 'El teléfono del apoderado debe contener exactamente 9 dígitos.' };
  }
  if (apoderadoDni && !/^\d{8}$/.test(apoderadoDni)) {
    return { error: 'El DNI del apoderado debe contener exactamente 8 dígitos.' };
  }

  const maxGrado = nivel === 'primaria' ? 6 : nivel === 'secundaria' ? 5 : 0;
  if (!maxGrado || !Number.isInteger(grado) || grado < 1 || grado > maxGrado ||
      !['A', 'B', 'C'].includes(seccion)) {
    return { error: 'Selecciona nivel, grado y sección válidos.' };
  }
  if (!cumpleEdadEscolar(fechaNacimiento, nivel, grado)) {
    return {
      error: nivel === 'primaria' && grado === 1
        ? 'El alumno debe tener entre 6 y 7 años para primero de primaria.'
        : 'La edad del alumno no corresponde al nivel y grado seleccionados.'
    };
  }

  return {
    value: {
      ...alumno, nombre, apellido, dni, telefono: telefono || null,
      fechaNacimiento, apoderadoNombre, apoderadoDni: apoderadoDni || null,
      apoderadoTelefono, nivel, grado, seccion
    }
  };
}

module.exports = { validarAlumno, cumpleEdadEscolar };
