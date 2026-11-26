const test = require('node:test');
const assert = require('node:assert/strict');
const {registrarMatricula} = require('./academicos');

const poolShouldNotBeUsed = {
  getConnection() {
    throw new Error('No debe conectarse con datos inválidos.');
  }
};

test('rechaza matrículas con curso repetido antes de abrir una transacción', async () => {
  const result = await registrarMatricula(poolShouldNotBeUsed, {
    idAlumno: 1,
    grupo: 'A1',
    cursos: [1101, 1101],
    periodoAcademico: '2026-II'
  });
  assert.equal(result.status, 400);
  assert.match(result.error, /repetidos/);
});

test('rechaza matrículas con grupo o periodo no válidos', async () => {
  const result = await registrarMatricula(poolShouldNotBeUsed, {
    idAlumno: 1,
    grupo: 'C1',
    cursos: [1101],
    periodoAcademico: '2026'
  });
  assert.equal(result.status, 400);
  assert.match(result.error, /válidos/);
});

test('registra cursos múltiples dentro de una transacción y conserva el periodo y grupo', async () => {
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
      if(sql.startsWith('SELECT idAlumno'))return [[{idAlumno:7}],[]];
      if(sql.startsWith('SELECT periodoAcademico'))return [[{periodoAcademico:'2026-II'}],[]];
      if(sql.startsWith('SELECT nrcCurso'))return [[{nrcCurso:1101},{nrcCurso:1102}],[]];
      if(sql.startsWith('INSERT INTO matricula')){
        insertedId+=1;
        return [{insertId:insertedId},[]];
      }
      return [{affectedRows:1},[]];
    }
  };
  const result=await registrarMatricula({getConnection:async()=>connection},{
    idAlumno:7,
    grupo:'B2',
    cursos:[1101,1102],
    periodoAcademico:'2026-II',
    modalidad:'Tarde'
  });
  assert.equal(committed,true);
  assert.equal(result.matriculas.length,2);
  assert.deepEqual(result.matriculas.map(item=>item.nrcCurso),[1101,1102]);
  assert.ok(statements.filter(item=>item.sql.startsWith('INSERT INTO matricula'))
    .every(item=>item.values[2]==='2026-II'&&item.values[3]==='B2'));
});
