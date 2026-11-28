let CU=null,currentRole='teacher',allStudents=[],allGrades=[],allTasks=[],taskFilter='all',allMatriculas=[],allReclamos=[],allRegistros=[],dashboardStats={},academicAssignments=[];
let currentAssignmentId='';

const DATA_KEY='academia_decam_data_v2';
const DATA_COLLECTIONS={
  allStudents:{get:()=>allStudents,set:value=>allStudents=value},
  allGrades:{get:()=>allGrades,set:value=>allGrades=value},
  allTasks:{get:()=>allTasks,set:value=>allTasks=value},
  allMatriculas:{get:()=>allMatriculas,set:value=>allMatriculas=value},
  allReclamos:{get:()=>allReclamos,set:value=>allReclamos=value},
  allRegistros:{get:()=>allRegistros,set:value=>allRegistros=value}
};
async function loadDataStore(){
  try{
    const stored=JSON.parse(localStorage.getItem(DATA_KEY)||'{}');
    Object.entries(DATA_COLLECTIONS).forEach(([key,accessors])=>{
      if(Array.isArray(stored[key]))accessors.set(stored[key]);
    });
  }catch(error){console.warn('No se pudo cargar el almacenamiento local',error);}
  try{
    const response=await fetch(CFG.apiUrl+'/api/dashboard');
    if(!response.ok)throw new Error('Respuesta API '+response.status);
    const data=await response.json();
    allStudents=(data.students||[]).map(student=>({...student,section:student.section||'Sin sección'}));
    allGrades=CU&&CU.role==='student'?(data.gradesStudent||[]):(data.gradesTeacher||[]);
    allTasks=(data.tasks||[]).map(t=>({
      id:t.idTarea,title:t.titulo,subject:t.materia||'General',type:t.tipo||'Tarea',
      dueDate:t.fechaEntrega,status:t.estado==='atrasada'?'late':t.estado==='entregada'?'done':'pending',color:t.color
    }));
    allMatriculas=(data.matriculas||[]).map(m=>({id:m.idMatricula,alumnoId:m.idAlumno,nro:'MAT-'+String(m.idMatricula).padStart(4,'0'),nombre:m.nombreAlumno,seccion:formatAcademicSection(m.nivel,m.grado,m.seccion),nivel:m.nivel,grado:m.grado,seccionLetra:m.seccion,curso:m.nombreCurso,nrcCurso:m.nrcCurso,anio:m.periodoAcademico,fecha:m.fecha,estado:m.estado}));
    allReclamos=(data.reclamos||[]).map(r=>({id:r.idReclamo,asunto:r.motivo,tipo:'academico',prioridad:r.prioridad||'normal',desc:r.descripcion||'',autor:r.nombreAlumno,fecha:r.fecha,estado:r.estado==='en_revision'?'revision':r.estado}));
    const registrosRemotos=[...(data.alumnos||[]).map(a=>({id:'alumno-'+a.idAlumno,nombre:`${a.nombre} ${a.apellido}`.trim(),nombres:a.nombre||'',apellido:a.apellido||'',tipo:'alumno',dni:a.dni,email:a.correo||'',tel:a.telefono||'',fechanac:a.fechaNacimientoFormulario||a.fechaNacimiento||'',sexo:({masculino:'M',femenino:'F'}[String(a.sexo||'').trim().toLowerCase()]||a.sexo||''),nivel:a.nivel||'',grado:a.grado||'',seccion:a.seccion||'',procedencia:a.procedencia||'',direccion:a.direccion||'',apoderado:a.apoderadoNombre||'',apoDni:a.apoderadoDni||'',apoTel:a.apoderadoTelefono||'',apoEmail:a.apoderadoCorreo||'',obs:a.apoderadoObservaciones||'',fecha:'Base de datos'})),...(data.docentes||[]).map(d=>({id:'docente-'+d.idDocente,nombre:`${d.nombre} ${d.apellido}`.trim(),tipo:'docente',email:d.correo||'',tel:d.telefono||'',fecha:'Base de datos'}))];
    allRegistros=registrosRemotos;
    dashboardStats=data.stats||{};
    localStorage.setItem(DATA_KEY,JSON.stringify({allStudents,allGrades,allTasks,allMatriculas,allReclamos,allRegistros}));
  }catch(error){console.warn('No se pudo cargar MySQL; se usa la copia local.',error);}
  updateDataStatus();
}
function saveDataStore(){
  const payload=Object.fromEntries(
    Object.entries(DATA_COLLECTIONS).map(([key,accessors])=>[key,accessors.get()])
  );
  localStorage.setItem(DATA_KEY,JSON.stringify(payload));
  updateDataStatus();
  if(CFG.apiUrl) syncDataWithApi(payload);
}
async function guardarAlumnoEnServidor(registro){
  let response;
  try{
    response=await fetch(CFG.apiUrl+'/api/alumno',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        nombre:registro.nombres,
        apellido:registro.apellido,
        dni:registro.dni,
        nivel:registro.nivel,
        grado:Number(registro.grado),
        seccion:registro.seccion,
        correo:registro.email,
        telefono:registro.tel,
        fechaNacimiento:registro.fechanac,
        sexo:registro.sexo,
        direccion:registro.direccion,
        apoderadoNombre:registro.apoderado,
        apoderadoDni:registro.apoDni,
        apoderadoTelefono:registro.apoTel,
        apoderadoCorreo:registro.apoEmail,
        apoderadoObservaciones:registro.obs
      })
    });
  }catch(error){
    throw new Error('No se pudo conectar con el servidor. El alumno no fue guardado.');
  }
  const result=await response.json();
  if(response.status===409&&/dni/i.test(result.error||''))throw new Error('DNI ya existente.');
  if(response.status===409||response.status===400)throw new Error(result.error||'No se pudo validar el registro.');
  if(!response.ok)throw new Error(result.error||`No se pudo guardar el alumno (HTTP ${response.status}).`);
  return {almacenamiento:'mysql',id:result.id};
}
async function guardarPersonalEnServidor(registro){
  let response;
  try{
    response=await fetch(CFG.apiUrl+'/api/personal',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        nombre:registro.nombres,
        apellido:registro.apellido,
        telefono:registro.tel,
        rol:registro.tipo==='docente'?'teacher':registro.tipo,
        asignaciones:registro.asignaciones || []
      })
    });
  }catch(error){
    throw new Error('No se pudo conectar con el servidor. El personal no fue registrado.');
  }
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||`No se pudo registrar el personal (HTTP ${response.status}).`);
  return result;
}
async function loadAcademicAssignments(){
  if(!CU||!['teacher','jefe'].includes(CU.role))return;
  const response=await fetch(CFG.apiUrl+'/api/asignacion-docente');
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'No se pudieron cargar las asignaciones académicas.');
  academicAssignments=Array.isArray(result)?result:[];
  const options=academicAssignments.map(assignment=>
    `<option value="${assignment.idAsignacion}">${assignment.nombreCurso} - ${formatAcademicSection(assignment.nivel,assignment.grado,assignment.seccion)} (${assignment.periodoAcademico})</option>`
  ).join('');
  ['att-assignment-filter','grades-assignment-filter'].forEach(id=>{
    const select=document.getElementById(id);
    if(!select)return;
    select.innerHTML='<option value="">Seleccionar curso y grado</option>'+options;
    select.value='';
  });
}
function updateDataStatus(){
  const status=document.getElementById('data-status');
  const label=document.getElementById('data-status-label');
  if(!status||!label)return;
  const connected=status.dataset.connected==='true';
  status.classList.toggle('api',connected);
  label.textContent=connected?'MySQL local conectado':'Datos locales';
  status.title=connected?'Dashboard conectado a '+CFG.apiUrl:'El dashboard funciona en modo local. Inicia el servidor Node y MySQL para conectar la base de datos.';
}
async function syncDataWithApi(payload){
  try{await fetch(CFG.apiUrl+'/api/salud');}catch(error){console.warn('MySQL local no esta disponible; se conserva la copia local.',error);}
}
async function checkApiConnection(){
  const status=document.getElementById('data-status');
  if(!status||!CFG.apiUrl)return;
  try{
    const response=await fetch(CFG.apiUrl+'/api/salud');
    const data=await response.json();
    status.dataset.connected=String(Boolean(response.ok&&data.mysql));
  }catch(error){
    status.dataset.connected='false';
  }
  updateDataStatus();
}
