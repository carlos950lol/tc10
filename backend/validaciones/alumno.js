function validarAlumno(alumno) {
  if (!alumno || typeof alumno !== 'object' || Array.isArray(alumno)) {
    return { error: 'Los datos del alumno no son válidos.' };
  }

  const nombre = String(alumno.nombre || '').trim();
  const apellido = String(alumno.apellido || '').trim();
  const dni = String(alumno.dni || '').trim();
  const telefono = String(alumno.telefono || '').trim();
  const fechaNacimiento = String(alumno.fechaNacimiento || '').trim();
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
  const hoy = new Date();
  const fechaLimite = new Date(hoy.getFullYear() - 6, hoy.getMonth(), hoy.getDate());
  if (Number.isNaN(nacimiento.getTime()) || nacimiento.getFullYear() !== year ||
      nacimiento.getMonth() !== month - 1 || nacimiento.getDate() !== day) {
    return { error: 'La fecha de nacimiento no es válida.' };
  }
  if (nacimiento > fechaLimite) {
    return { error: 'El alumno debe tener al menos 6 años.' };
  }
  if (!apoderadoNombre) return { error: 'Los nombres y apellidos del apoderado son obligatorios.' };
  if (!/^\d{9}$/.test(apoderadoTelefono)) {
    return { error: 'El teléfono del apoderado debe contener exactamente 9 dígitos.' };
  }
  if (apoderadoDni && !/^\d{8}$/.test(apoderadoDni)) {
    return { error: 'El DNI del apoderado debe contener exactamente 8 dígitos.' };
  }

  const grupo = alumno.grupo == null ? null : String(alumno.grupo).trim();
  if (grupo && !/^[AB][1-6]$/.test(grupo)) {
    return { error: 'El grupo debe tener un formato válido (A1-B6).' };
  }

  return {
    value: {
      ...alumno, nombre, apellido, dni, telefono: telefono || null,
      fechaNacimiento, apoderadoNombre, apoderadoDni: apoderadoDni || null,
      apoderadoTelefono, grupo: grupo || null
    }
  };
}

module.exports = { validarAlumno };
