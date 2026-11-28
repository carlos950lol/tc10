const test = require('node:test');
const assert = require('node:assert/strict');
const {generarCorreoPersonal} = require('./personal');

test('genera correo personal con nombre completo normalizado y dominio institucional', () => {
  assert.equal(
    generarCorreoPersonal('  José María  ', 'Pérez López '),
    'jose.maria.perez.lopez@acadecam.edu.pe'
  );
});

test('rechaza nombres que no permiten generar un correo válido', () => {
  assert.equal(generarCorreoPersonal('!!!', '???'), null);
});
