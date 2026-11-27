const test = require('node:test');
const assert = require('node:assert/strict');
const {registrarMatricula} = require('./academicos');

const poolShouldNotBeUsed = {
  getConnection() {
    throw new Error('No debe conectarse con datos inválidos.');
  }
};

const ubicacionValida = {nivel: 'primaria', grado: 6, seccion: 'B'};

test('rechaza matrículas con curso repetido antes de abrir una transacción', async () => {
  const result = await registrarMatricula(poolShouldNotBeUsed, {
    idAlumno: 1,
    ...ubicacionValida,
    cursos: [1101, 1101],
    periodoAcademico: '2026-II'
  });
  assert.equal(result.status, 400);
  assert.match(result.error, /repetidos/);
});

test('rechaza matrículas con nivel, grado, sección o periodo no válidos', async () => {
  const result = await registrarMatricula(poolShouldNotBeUsed, {
    idAlumno: 1,
    nivel: 'secundaria',
    grado: 6,
    seccion: 'D',
    cursos: [1101],
    periodoAcademico: '2026'
  });
  assert.equal(result.status, 400);
  assert.match(result.error, /válidos/);
});

test('rechaza matrículas si un curso no tiene docente para esa sección y periodo', async () => {
  const statements=[];
  let committed=false;
  const connection={
    async beginTransaction(){},
    async commit(){committed=true;},
    async rollback(){},
    release(){},
    async query(sql, values){
      statements.push({sql,values});
      if(sql.startsWith('SELECT idAlumno'))return [[{idAlumno:7,fechaNacimiento:'2015-04-20'}],[]];
      if(sql.startsWith('SELECT periodoAcademico'))return [[{periodoAcademico:'2026-II'}],[]];
      if(sql.startsWith('SELECT nrcCurso FROM curso'))return [[{nrcCurso:1101},{nrcCurso:1102}],[]];
      if(sql.startsWith('SELECT nrcCurso FROM asignacion_docente'))return [[{nrcCurso:1101}],[]];
      return [{affectedRows:1},[]];
    }
  };
  const result=await registrarMatricula({getConnection:async()=>connection},{
    idAlumno:7,
    ...ubicacionValida,
    cursos:[1101,1102],
    periodoAcademico:'2026-II'
  });
  assert.equal(committed,false);
  assert.equal(result.status,400);
  assert.match(result.error,/no tienen docente asignado/);
  assert.deepEqual(
    statements.find(item=>item.sql.startsWith('SELECT nrcCurso FROM asignacion_docente')).values,
    [1101,1102,'primaria',6,'B','2026-II']
  );
  assert.equal(statements.some(item=>item.sql.startsWith('INSERT INTO matricula')),false);
});

test('registra cursos múltiples dentro de una transacción y conserva su sección y periodo', async () => {
  const statements=[];
  let insertedId=10;
  let committed=false;
  const connection={
    async beginTransaction(){},
    async commit(){committed=true;},
    async rollback(){},
    release(){},
    async query(sql, values){
      statements.push({sql,values});
      if(sql.startsWith('SELECT idAlumno'))return [[{idAlumno:7,fechaNacimiento:'2015-04-20'}],[]];
      if(sql.startsWith('SELECT periodoAcademico'))return [[{periodoAcademico:'2026-II'}],[]];
      if(sql.startsWith('SELECT nrcCurso FROM curso'))return [[{nrcCurso:1101},{nrcCurso:1102}],[]];
      if(sql.startsWith('SELECT nrcCurso FROM asignacion_docente'))return [[{nrcCurso:1101},{nrcCurso:1102}],[]];
      if(sql.startsWith('INSERT INTO matricula')){
        insertedId+=1;
        return [{insertId:insertedId},[]];
      }
      return [{affectedRows:1},[]];
    }
  };
  const result=await registrarMatricula({getConnection:async()=>connection},{
    idAlumno:7,
    ...ubicacionValida,
    cursos:[1101,1102],
    periodoAcademico:'2026-II',
    modalidad:'Tarde'
  });
  assert.equal(committed,true);
  assert.equal(result.matriculas.length,2);
  assert.deepEqual(result.matriculas.map(item=>item.nrcCurso),[1101,1102]);
  assert.ok(statements.filter(item=>item.sql.startsWith('INSERT INTO matricula'))
    .every(item=>item.values[2]==='2026-II'&&item.values[3]==='primaria'&&
      item.values[4]===6&&item.values[5]==='B'));
});

test('rechaza una matrícula si la edad no corresponde al nivel y grado', async () => {
  let committed = false;
  const statements = [];
  const connection = {
    async beginTransaction(){},
    async commit(){committed = true;},
    async rollback(){},
    release(){},
    async query(sql) {
      statements.push(sql);
      if (sql.startsWith('SELECT idAlumno')) {
        return [[{idAlumno:7,fechaNacimiento:'2018-04-20'}],[]];
      }
      return [{affectedRows:1},[]];
    }
  };
  const result = await registrarMatricula({getConnection:async()=>connection},{
    idAlumno:7,
    nivel:'primaria',
    grado:6,
    seccion:'B',
    cursos:[1101],
    periodoAcademico:'2026-II'
  });
  assert.equal(committed,false);
  assert.equal(result.status,400);
  assert.match(result.error,/edad del alumno/);
  assert.equal(statements.some(sql=>sql.startsWith('INSERT INTO matricula')),false);
});
