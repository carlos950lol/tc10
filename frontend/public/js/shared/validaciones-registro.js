function validarRegistroAlumno({ nombres, apellidos, dni }, registros = allRegistros) {
  if (!nombres.trim()) return 'Los nombres son obligatorios.';
  if (!apellidos.trim()) return 'Los apellidos son obligatorios.';
  if (!/^\d{8}$/.test(dni.trim())) return 'El DNI debe contener exactamente 8 dígitos.';
  if (registros.some(registro =>
    registro.tipo === 'alumno' && String(registro.dni || '').trim() === dni.trim()
  )) {
    return 'DNI ya existente.';
  }
  return '';
}
