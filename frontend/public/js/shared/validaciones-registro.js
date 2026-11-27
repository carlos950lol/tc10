function validarRegistroAlumno(datos, registros = allRegistros) {
  const { nombres = '', apellidos = '', fechaNacimiento = '', telefono = '',
    apoderadoNombre = '', apoderadoDni = '', apoderadoTelefono = '',
    nivel = '', grado = '', seccion = '' } = datos;
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
  const maxGrado = nivel === 'primaria' ? 6 : nivel === 'secundaria' ? 5 : 0;
  const gradoNumero = Number(grado);
  if (!maxGrado || !Number.isInteger(gradoNumero) ||
      gradoNumero < 1 || gradoNumero > maxGrado || !['A', 'B', 'C'].includes(seccion)) {
    return 'Selecciona nivel, grado y sección válidos.';
  }
  const today = new Date();
  const edad = today.getFullYear() - birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
  const edadBase = nivel === 'primaria' ? gradoNumero + 5 : gradoNumero + 11;
  if (edad < edadBase || edad > edadBase + 1) {
    return nivel === 'primaria' && gradoNumero === 1
      ? 'El alumno debe tener entre 6 y 7 años para primero de primaria.'
      : 'La edad del alumno no corresponde al nivel y grado seleccionados.';
  }
  if (!apoderadoNombre.trim()) return 'Los nombres y apellidos del apoderado son obligatorios.';
  if (apoderadoDni && !/^\d{8}$/.test(apoderadoDni.trim())) return 'El DNI del apoderado debe contener exactamente 8 dígitos.';
  if (!/^\d{9}$/.test(apoderadoTelefono.trim())) return 'El teléfono del apoderado debe contener exactamente 9 dígitos.';
  return '';
}
