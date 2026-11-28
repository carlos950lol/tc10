const PERSONAL_EMAIL_DOMAIN = 'acadecam.edu.pe';
const MAX_EMAIL_LENGTH = 150;

function generarCorreoPersonal(nombre, apellido) {
  const nombreCompleto = `${nombre} ${apellido}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const usuario = nombreCompleto
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  const correo = `${usuario}@${PERSONAL_EMAIL_DOMAIN}`;

  if (!usuario || usuario.length > 64 || correo.length > MAX_EMAIL_LENGTH) {
    return null;
  }
  return correo;
}

module.exports = {generarCorreoPersonal};
