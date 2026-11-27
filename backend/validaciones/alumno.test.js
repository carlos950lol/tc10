const test = require('node:test');
const assert = require('node:assert/strict');
const {validarAlumno, cumpleEdadEscolar} = require('./alumno');

const alumnoValido = {
  nombre: 'Ana María',
  apellido: 'Pérez Díaz',
  dni: '12345678',
  nivel: 'primaria',
  grado: 6,
  seccion: 'A',
  fechaNacimiento: '2015-04-20',
  telefono: '987654321',
  apoderadoNombre: 'Luis Pérez',
  apoderadoDni: '87654321',
  apoderadoTelefono: '912345678'
};

test('acepta los datos completos válidos de alumno y apoderado', () => {
  const result = validarAlumno(alumnoValido);
  assert.equal(result.error, undefined);
  assert.equal(result.value.dni, alumnoValido.dni);
  assert.equal(result.value.apoderadoTelefono, alumnoValido.apoderadoTelefono);
});

test('rechaza DNI y teléfonos con longitud o caracteres inválidos', () => {
  assert.match(validarAlumno({...alumnoValido, dni: '1234AB78'}).error, /DNI/);
  assert.match(validarAlumno({...alumnoValido, telefono: '987 65432'}).error, /teléfono del alumno/);
  assert.match(validarAlumno({...alumnoValido, apoderadoTelefono: '91234567A'}).error, /teléfono del apoderado/);
});

test('rechaza fechas inexistentes y alumnos menores de seis años', () => {
  assert.match(validarAlumno({...alumnoValido, fechaNacimiento: '2021-02-29'}).error, /fecha de nacimiento/);
  assert.match(validarAlumno({...alumnoValido, fechaNacimiento: '2022-01-01'}).error, /edad/);
});

test('valida la edad permitida por nivel y grado', () => {
  const referenceDate = new Date(2026, 10, 27);
  assert.equal(cumpleEdadEscolar('2020-11-27', 'primaria', 1, referenceDate), true);
  assert.equal(cumpleEdadEscolar('2019-11-28', 'primaria', 1, referenceDate), true);
  assert.equal(cumpleEdadEscolar('2018-11-27', 'primaria', 1, referenceDate), false);
  assert.equal(cumpleEdadEscolar('2010-11-27', 'secundaria', 5, referenceDate), true);
  assert.equal(cumpleEdadEscolar('2009-11-28', 'secundaria', 5, referenceDate), true);
  assert.equal(cumpleEdadEscolar('2008-11-27', 'secundaria', 5, referenceDate), false);
});

test('requiere datos de contacto del apoderado y valida su DNI opcional', () => {
  assert.match(validarAlumno({...alumnoValido, apoderadoNombre: ''}).error, /apoderado/);
  assert.match(validarAlumno({...alumnoValido, apoderadoDni: '12-45678'}).error, /DNI del apoderado/);
});

test('exige nivel, grado y sección A, B o C', () => {
  assert.match(validarAlumno({...alumnoValido, nivel: 'otro'}).error, /nivel, grado y sección/);
  assert.match(validarAlumno({...alumnoValido, grado: 7}).error, /nivel, grado y sección/);
  assert.match(validarAlumno({...alumnoValido, seccion: 'D'}).error, /nivel, grado y sección/);
});
