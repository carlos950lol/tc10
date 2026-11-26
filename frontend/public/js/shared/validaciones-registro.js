function validarRegistroAlumno(datos, registros = allRegistros) {
  const { nombres = '', apellidos = '', fechaNacimiento = '', telefono = '',
    apoderadoNombre = '', apoderadoDni = '', apoderadoTelefono = '' } = datos;
  if (!nombres.trim()) return 'Los nombres son obligatorios.';
  if (!apellidos.trim()) return 'Los apellidos son obligatorios.';
  if (!/^\d{8}$/.test(String(datos.dni || '').trim())) return 'El DNI debe contener exactamente 8 dígitos.';
  if (registros.some(registro =>
    registro.tipo === 'alumno' && String(registro.dni || '').trim() === String(datos.dni || '').trim()
  )) {
    return 'DNI ya existente.';
  }
  if (telefono && !/^\d{9}$/.test(telefono.trim())) return 'El teléfono del alumno debe contener exactamente 9 dígitos.';
  if (!fechaNacimiento) return 'La fecha de nacimiento es obligatoria.';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaNacimiento);
  if (!match) return 'La fecha de nacimiento no es válida.';
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (birth.getFullYear() !== Number(match[1]) || birth.getMonth() !== Number(match[2]) - 1 || birth.getDate() !== Number(match[3])) {
    return 'La fecha de nacimiento no es válida.';
  }
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 6, today.getMonth(), today.getDate());
  if (birth > cutoff) return 'El alumno debe tener al menos 6 años.';
  if (!apoderadoNombre.trim()) return 'Los nombres y apellidos del apoderado son obligatorios.';
  if (apoderadoDni && !/^\d{8}$/.test(apoderadoDni.trim())) return 'El DNI del apoderado debe contener exactamente 8 dígitos.';
  if (!/^\d{9}$/.test(apoderadoTelefono.trim())) return 'El teléfono del apoderado debe contener exactamente 9 dígitos.';
  return '';
}
