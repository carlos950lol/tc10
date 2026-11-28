// ========================
// FUNCIONES NUEVAS PÁGINAS
// ========================
let matriculaCourseRequest=0;

function buildNombreCompleto(nombres, apellidos){
  return [nombres, apellidos].filter(Boolean).map(valor => String(valor).trim()).filter(Boolean).join(' ');
}

function separarNombreCompleto(nombreCompleto){
  const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  if(!partes.length) return {nombres:'', apellidos:''};
  if(partes.length === 1) return {nombres:partes[0], apellidos:''};
  if(partes.length === 2) return {nombres:partes[0], apellidos:partes[1]};
  return {
    nombres: partes.slice(0, -2).join(' '),
    apellidos: partes.slice(-2).join(' ')
  };
}

function mostrarAvisoFormulario(id, mensaje, tipo = 'error'){
  const aviso = document.getElementById(id);
  if(!aviso) return;
  aviso.textContent = mensaje;
  aviso.hidden = !mensaje;
  const esExito = tipo === 'success';
  aviso.style.color = esExito ? '#166534' : '#b91c1c';
  aviso.style.backgroundColor = esExito ? '#f0fdf4' : '#fef2f2';
  aviso.style.border = esExito ? '1px solid #bbf7d0' : '1px solid #fecaca';
  aviso.style.borderRadius = '8px';
  aviso.style.padding = '9px 12px';
  aviso.style.fontWeight = '600';
  aviso.setAttribute('role', tipo === 'success' ? 'status' : 'alert');
  aviso.setAttribute('aria-live', tipo === 'success' ? 'polite' : 'assertive');
}

function mostrarErrorMatricula(mensaje){
  mostrarAvisoFormulario('ci-mat-error', mensaje);
}

function saveMatricula(){
  const nombres = document.getElementById('mat-nombres')?.value.trim() || '';
  const apellidos = document.getElementById('mat-apellidos')?.value.trim() || '';
  const nombre = buildNombreCompleto(nombres, apellidos);
  const seccion = document.getElementById('mat-seccion').value;
  mostrarAvisoFormulario('mat-error', '');
  if(!nombres || !apellidos || !seccion){
    mostrarAvisoFormulario('mat-error', 'Completa nombres, apellidos y sección para registrar la matrícula.');
    return;
  }
  const mat = {
    id: Date.now(),
    nro: 'MAT-' + String(allMatriculas.length+1).padStart(4,'0'),
    nombre,
    nombres,
    apellido: apellidos,
    dni: document.getElementById('mat-dni').value.trim(),
    seccion,
    anio: document.getElementById('mat-anio').value||'2025',
    apoderado: document.getElementById('mat-apoderado').value.trim(),
    obs: document.getElementById('mat-obs').value.trim(),
    fecha: new Date().toLocaleDateString('es-PE'),
    estado: 'activa'
  };
  allMatriculas.push(mat);
  saveDataStore();
  renderMatriculas();
  closeModal('modal-new-matricula');
  ['mat-nombres','mat-apellidos','mat-dni','mat-apoderado','mat-obs'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value='';
  });
  document.getElementById('mat-seccion').value='';
}
// Opciones de grado según nivel (Primaria 1-6, Secundaria 1-5)
function updateGradoOptions(nivelId, gradoId){
  const nivel = document.getElementById(nivelId)?.value;
  const gradoSel = document.getElementById(gradoId);
  if(!gradoSel) return;
  if(!nivel){
    gradoSel.innerHTML = '<option value="">Selecciona nivel primero</option>';
    gradoSel.disabled = true;
    return;
  }
  const max = nivel === 'primaria' ? 6 : 5;
  let opts = '<option value="">Seleccionar...</option>';
  for(let i=1;i<=max;i++){ opts += `<option value="${i}">${i}°</option>`; }
  gradoSel.innerHTML = opts;
  gradoSel.disabled = false;
}

function bloquearCamposAlumnoMatricula(bloquear = true){
  const campos = [
    'ci-mat-nombres','ci-mat-apellidos','ci-mat-dni','ci-mat-fechanac','ci-mat-sexo','ci-mat-procedencia',
    'ci-mat-direccion','ci-mat-apoderado','ci-mat-apo-dni','ci-mat-apo-tel','ci-mat-apo-email','ci-mat-obs'
  ];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.disabled = bloquear;
    if(bloquear){
      el.style.background = 'var(--input-disabled, #f8fafc)';
    } else {
      el.style.background = '';
    }
  });
}

function asignarCampoAlumnoMatricula(id, valor){
  const el = document.getElementById(id);
  if(!el) return;
  if(el.tagName !== 'SELECT'){
    el.value = valor;
    return;
  }

  el.querySelector('option[data-alumno-dynamic]')?.remove();
  const valorNormalizado = String(valor || '').trim();
  const opcion = Array.from(el.options).find(item =>
    item.value.toLowerCase() === valorNormalizado.toLowerCase() ||
    item.textContent.trim().toLowerCase() === valorNormalizado.toLowerCase()
  );
  if(opcion){
    el.value = opcion.value;
    return;
  }
  if(!valorNormalizado){
    el.value = '';
    return;
  }

  const opcionAlumno = document.createElement('option');
  opcionAlumno.value = valorNormalizado;
  opcionAlumno.textContent = valorNormalizado;
  opcionAlumno.dataset.alumnoDynamic = 'true';
  el.append(opcionAlumno);
  el.value = valorNormalizado;
}

function renderMatriculaAlumnoOptions(filtro = ''){
  const select = document.getElementById('ci-mat-alumno-registrado');
  const busqueda = document.getElementById('ci-mat-buscar-alumno');
  const sugerencias = document.getElementById('ci-mat-alumno-sugerencias');
  if(!select) return;
  const texto = (filtro || busqueda?.value || '').toLowerCase().trim();
  const alumnos = allRegistros.filter(r => r.tipo === 'alumno').sort((a,b) => a.nombre.localeCompare(b.nombre));
  const filtrados = texto
    ? alumnos.filter(alumno => {
        const nombre = (alumno.nombre || '').toLowerCase();
        const dni = (alumno.dni || '').toLowerCase();
        return nombre.includes(texto) || dni.includes(texto);
      })
    : alumnos;

  if(sugerencias){
    if(!texto || !filtrados.length){
      sugerencias.style.display = 'none';
      sugerencias.innerHTML = '';
    } else {
      sugerencias.style.display = 'block';
      sugerencias.innerHTML = filtrados.slice(0, 8).map(alumno => {
        const label = alumno.dni ? `${alumno.dni} - ${alumno.nombre}` : alumno.nombre;
        return `<button type="button" class="matricula-alumno-suggestion" data-alumno-id="${String(alumno.id)}" onclick="seleccionarAlumnoMatricula('${String(alumno.id)}')" style="display:block;width:100%;text-align:left;padding:9px 10px;border:0;cursor:pointer;border-radius:8px;font-size:13px;line-height:1.3;transition:all .15s ease;">${label}</button>`;
      }).join('');
    }
  }

  if(!filtrados.length){
    select.innerHTML = '<option value="">No hay coincidencias</option>';
    select.disabled = true;
    bloquearCamposAlumnoMatricula(true);
    return;
  }
  select.innerHTML = '<option value="">Seleccionar alumno existente...</option>' + filtrados.map(alumno => {
    const label = alumno.dni ? `${alumno.dni} - ${alumno.nombre}` : alumno.nombre;
    return `<option value="${String(alumno.id)}">${label}</option>`;
  }).join('');
  select.disabled = false;
  bloquearCamposAlumnoMatricula(true);
}

function seleccionarAlumnoMatricula(id){
  const select = document.getElementById('ci-mat-alumno-registrado');
  const busqueda = document.getElementById('ci-mat-buscar-alumno');
  const sugerencias = document.getElementById('ci-mat-alumno-sugerencias');
  if(!select || !busqueda) return;
  const alumno = allRegistros.find(r => String(r.id) === String(id) && r.tipo === 'alumno');
  if(!alumno) return;
  select.value = String(id);
  busqueda.value = alumno.nombre || '';
  if(sugerencias){
    sugerencias.style.display = 'none';
    sugerencias.innerHTML = '';
  }
  cargarAlumnoMatriculaSeleccionado();
}

function filtrarAlumnosMatricula(){
  const valor = document.getElementById('ci-mat-buscar-alumno')?.value || '';
  renderMatriculaAlumnoOptions(valor);
}

function cargarAlumnoMatriculaSeleccionado(){
  const select = document.getElementById('ci-mat-alumno-registrado');
  if(!select) return;
  if(!select.value){
    bloquearCamposAlumnoMatricula(true);
    return;
  }

  const alumno = allRegistros.find(r => String(r.id) === String(select.value) && r.tipo === 'alumno');
  if(!alumno) return;

  const nombreSeparado = separarNombreCompleto(alumno.nombre || '');
  const campos = {
    'ci-mat-nombres': alumno.nombres || nombreSeparado.nombres,
    'ci-mat-apellidos': alumno.apellido || alumno.apellidos || nombreSeparado.apellidos,
    'ci-mat-dni': alumno.dni || '',
    'ci-mat-fechanac': alumno.fechanac || '',
    'ci-mat-sexo': alumno.sexo || '',
    'ci-mat-procedencia': alumno.procedencia || 'nuevo',
    'ci-mat-direccion': alumno.direccion || '',
    'ci-mat-apoderado': alumno.apoderado || '',
    'ci-mat-apo-dni': alumno.apoDni || '',
    'ci-mat-apo-tel': alumno.apoTel || '',
    'ci-mat-apo-email': alumno.apoEmail || '',
    'ci-mat-obs': alumno.obs || ''
  };

  Object.entries(campos).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if(!el) return;
    asignarCampoAlumnoMatricula(id, value);
  });

  bloquearCamposAlumnoMatricula(true);
}

function resetMatriculaAlumno(){
  ['ci-mat-buscar-alumno','ci-mat-nombres','ci-mat-apellidos','ci-mat-dni','ci-mat-fechanac','ci-mat-direccion','ci-mat-apoderado','ci-mat-apo-dni','ci-mat-apo-tel','ci-mat-apo-email','ci-mat-obs','ci-mat-sexo','ci-mat-procedencia','ci-mat-alumno-registrado'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['ci-mat-nivel','ci-mat-seccion','ci-mat-periodo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const gradeSelect=document.getElementById('ci-mat-grado');
  if(gradeSelect)gradeSelect.value='';
  loadMatriculaCourses();
  mostrarErrorMatricula('');
  const sugerencias = document.getElementById('ci-mat-alumno-sugerencias');
  if(sugerencias){
    sugerencias.style.display = 'none';
    sugerencias.innerHTML = '';
  }
  bloquearCamposAlumnoMatricula(true);
  renderMatriculaAlumnoOptions();
  showMatriculaStep(1);
}

function showMatriculaStep(step){
  mostrarErrorMatricula('');
  if(step === 2){
    const alumno = document.getElementById('ci-mat-alumno-registrado')?.value;
    const nivel = document.getElementById('ci-mat-nivel')?.value;
    const grado = document.getElementById('ci-mat-grado')?.value;
    const seccion = document.getElementById('ci-mat-seccion')?.value;
    const period=document.getElementById('ci-mat-periodo')?.value;
    const courses=Array.from(document.getElementById('ci-mat-cursos')?.selectedOptions||[]).filter(option=>option.value);
    if(!alumno || !nivel || !grado || !seccion || !period || !courses.length){
      mostrarErrorMatricula('Selecciona alumno, nivel, grado, sección, periodo y al menos un curso antes de continuar.');
      return;
    }
  }

  const steps = ['matricula-step-1','matricula-step-2'];
  steps.forEach((id, index) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.style.display = index === (step - 1) ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('#page-matricula .matricula-step-nav');
  buttons.forEach(btn => {
    const buttonStep = Number(btn.dataset.step);
    btn.classList.toggle('is-active', buttonStep === step);
    btn.classList.toggle('is-complete', buttonStep < step);
  });

  if(step === 2){
    const select = document.getElementById('ci-mat-alumno-registrado');
    const alumno = select && select.value ? allRegistros.find(r => String(r.id) === String(select.value) && r.tipo === 'alumno') : null;
    const nivel = document.getElementById('ci-mat-nivel')?.value || '—';
    const grado = document.getElementById('ci-mat-grado')?.value || '—';
    const seccion = document.getElementById('ci-mat-seccion')?.value || '—';
    const anio = document.getElementById('ci-mat-periodo')?.value || '—';
    const turno = document.getElementById('ci-mat-turno')?.value || '—';
    const selectedCourses=Array.from(document.getElementById('ci-mat-cursos')?.selectedOptions||[])
      .filter(option=>option.value);
    const resumen = document.getElementById('matricula-resumen-content');
    if(resumen){
      resumen.innerHTML = `<div style="display:grid;gap:10px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Alumno</span><span style="font-size:13px;font-weight:600;color:var(--navy)">${alumno ? alumno.nombre : 'No seleccionado'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">DNI</span><span style="font-size:13px;color:var(--navy)">${alumno ? (alumno.dni || '—') : '—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Nivel</span><span style="font-size:13px;color:var(--navy)">${nivel}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Grado</span><span style="font-size:13px;color:var(--navy)">${grado}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Sección</span><span style="font-size:13px;color:var(--navy)">${seccion}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Periodo académico</span><span style="font-size:13px;color:var(--navy)">${anio}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Cursos</span><span style="font-size:13px;color:var(--navy)">${selectedCourses.map(option=>option.textContent).join(', ')||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="font-size:12px;color:var(--muted)">Turno</span><span style="font-size:13px;color:var(--navy)">${turno}</span></div>
      </div>`;
    }
  }
}
// Formulario inline CI_Matricula
async function submitMatriculaForm(){
  mostrarErrorMatricula('');
  const select = document.getElementById('ci-mat-alumno-registrado');
  const alumnoSeleccionado = select && select.value ? allRegistros.find(r => String(r.id) === String(select.value) && r.tipo === 'alumno') : null;
  if(!alumnoSeleccionado){
    mostrarErrorMatricula('Selecciona un alumno registrado antes de confirmar la matrícula.');
    return;
  }

  const nombre = alumnoSeleccionado.nombre || '';
  const dni = alumnoSeleccionado.dni || '';
  const nivel = document.getElementById('ci-mat-nivel')?.value;
  const grado = document.getElementById('ci-mat-grado')?.value;
  const seccionLetra = document.getElementById('ci-mat-seccion')?.value;
  const periodoAcademico=document.getElementById('ci-mat-periodo')?.value||'';
  const selectedCourses=Array.from(document.getElementById('ci-mat-cursos')?.selectedOptions||[])
    .map(option=>option.value).filter(Boolean);
  if(!nombre || !nivel || !grado || !seccionLetra || !periodoAcademico || !selectedCourses.length){
    mostrarErrorMatricula('Completa nivel, grado, sección, periodo y al menos un curso para confirmar la matrícula.');
    return;
  }

  const seccionLabel = formatAcademicSection(nivel, grado, seccionLetra);
  const idAlumno=Number(String(alumnoSeleccionado.id).replace(/^alumno-/,''));
  const confirmButton=document.querySelector("#page-matricula button[onclick='submitMatriculaForm()']");
  if(confirmButton)confirmButton.disabled=true;
  let result;
  try{
    result=await academicRequest('/api/matricula','POST',{
      idAlumno,
      nivel,
      grado:Number(grado),
      seccion:seccionLetra,
      cursos:selectedCourses.map(Number),
      periodoAcademico,
      modalidad:document.getElementById('ci-mat-turno')?.value||'presencial'
    });
  }catch(error){
    mostrarErrorMatricula(error.message||'No se pudo registrar la matrícula en MySQL.');
    if(confirmButton)confirmButton.disabled=false;
    return;
  }
  const date=new Date().toLocaleDateString('es-PE');
  const coursesSelect=document.getElementById('ci-mat-cursos');
  const enrollments=(result.matriculas||[]).map(enrollment=>{
    const course=Array.from(coursesSelect?.options||[]).find(option=>Number(option.value)===enrollment.nrcCurso);
    return {
      id:enrollment.id,
      alumnoId:idAlumno,
      nro:'MAT-'+String(enrollment.id).padStart(4,'0'),
      nombre,
      dni,
      fechanac:alumnoSeleccionado.fechanac||'',
      sexo:alumnoSeleccionado.sexo||'',
      procedencia:alumnoSeleccionado.procedencia||'nuevo',
      direccion:alumnoSeleccionado.direccion||'',
      nivel,
      grado,
      seccion:seccionLabel,
      seccionLetra,
      curso:course?.textContent||String(enrollment.nrcCurso),
      nrcCurso:enrollment.nrcCurso,
      anio:periodoAcademico,
      turno:document.getElementById('ci-mat-turno')?.value||'presencial',
      apoderado:alumnoSeleccionado.apoderado||'',
      apoDni:alumnoSeleccionado.apoDni||'',
      apoTel:alumnoSeleccionado.apoTel||'',
      apoEmail:alumnoSeleccionado.apoEmail||'',
      obs:alumnoSeleccionado.obs||'',
      fecha:date,
      estado:'activa'
    };
  });
  allMatriculas.push(...enrollments);
  alumnoSeleccionado.seccion=seccionLetra;
  alumnoSeleccionado.section=seccionLabel;
  renderMatriculas();
  updateMatriculaCount();
  resetMatriculaAlumno();
  updateGradoOptions('ci-mat-nivel','ci-mat-grado');
  if(confirmButton)confirmButton.disabled=false;
  if(enrollments[0])showDtMatricula(enrollments[0]);
}
function showDtMatricula(mat){
  const el = document.getElementById('dt-matricula-detalle');
  if(!el) return;
  const estadoBadge = e=>({activa:'b-green',retirada:'b-red'}[e]||'b-gray');
  const procLabel = p=>({nuevo:'Alumno nuevo',traslado:'Traslado',promocion:'Promoción interna'}[p]||p||'—');
  const sexoLabel = s=>({M:'Masculino',F:'Femenino'}[s]||'—');
  el.innerHTML=`<div style="display:grid;gap:10px">
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">N° Matrícula</span><span style="font-size:13px;font-weight:700;color:var(--accent)">${mat.nro}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Alumno</span><span style="font-size:13px;font-weight:600;color:var(--navy)">${mat.nombre}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">DNI</span><span style="font-size:13px;color:var(--navy)">${mat.dni||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Curso</span><span style="font-size:13px;color:var(--navy)">${mat.curso||mat.nrcCurso||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Fecha de nacimiento</span><span style="font-size:13px;color:var(--navy)">${mat.fechanac||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Sexo</span><span style="font-size:13px;color:var(--navy)">${sexoLabel(mat.sexo)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Procedencia</span><span style="font-size:13px;color:var(--navy)">${procLabel(mat.procedencia)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Dirección</span><span style="font-size:13px;color:var(--navy);text-align:right;max-width:60%">${mat.direccion||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Nivel</span><span style="font-size:13px;color:var(--navy)">${mat.nivel||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Sección</span><span class="badge b-gray">${mat.seccion}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Año lectivo</span><span style="font-size:13px;color:var(--navy)">${mat.anio}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Turno</span><span style="font-size:13px;color:var(--navy)">${mat.turno||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Apoderado</span><span style="font-size:13px;color:var(--navy)">${mat.apoderado||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">DNI apoderado</span><span style="font-size:13px;color:var(--navy)">${mat.apoDni||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Teléfono apoderado</span><span style="font-size:13px;color:var(--navy)">${mat.apoTel||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Correo apoderado</span><span style="font-size:13px;color:var(--navy)">${mat.apoEmail||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="font-size:12px;color:var(--muted)">Estado</span><span class="badge ${estadoBadge(mat.estado)}">${mat.estado.charAt(0).toUpperCase()+mat.estado.slice(1)}</span></div>
    ${mat.obs?`<div style="padding:8px;background:var(--cream);border-radius:var(--r);font-size:12px;color:var(--muted)">${mat.obs}</div>`:''}
  </div><div style="margin-top:10px;padding:8px 12px;background:#f0fdf4;border-radius:var(--r);font-size:12px;color:#16a34a">✓ Matrícula registrada el ${mat.fecha}</div>`;
}
function updateMatriculaCount(){
  const el = document.getElementById('matricula-count');
  if(el) el.textContent = allMatriculas.length+' matrículas';
}

function renderMatriculas(){
  const tbody = document.getElementById('matricula-tbody');
  const f = document.getElementById('matricula-filter-estado')?.value||'all';
  const q = (document.getElementById('matricula-search')?.value||'').toLowerCase();
  let data = allMatriculas.filter(m=>(f==='all'||m.estado===f)&&(!q||`${m.nombre} ${m.seccion} ${m.curso||''}`.toLowerCase().includes(q)));
  if(!data.length){
    tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No hay matrículas que coincidan.</td></tr>';
    return;
  }
  const estadoBadge = e=>({activa:'b-green',retirada:'b-red'}[e]||'b-gray');
  tbody.innerHTML=data.map(m=>`<tr style="border-bottom:1px solid var(--border)">
    <td style="padding:10px 16px;font-size:12px;color:var(--muted);white-space:nowrap">${m.nro}</td>
    <td style="padding:10px 16px;font-size:13px;font-weight:500;color:var(--navy)">${m.nombre}</td>
    <td style="padding:10px 16px;font-size:13px;color:var(--muted)">${m.curso||m.nrcCurso||'—'}</td>
    <td style="padding:10px 16px;font-size:13px"><span class="badge b-gray">${m.seccion}</span></td>
    <td style="padding:10px 16px;font-size:13px;color:var(--muted)">${m.anio}</td>
    <td style="padding:10px 16px;font-size:13px;color:var(--muted);white-space:nowrap">${m.fecha}</td>
    <td style="padding:10px 16px"><span class="badge ${estadoBadge(m.estado)}" role="button" tabindex="0" onclick="toggleMatriculaEstado(${m.id})" style="cursor:pointer" title="Cambiar estado de la matrícula">${m.estado.charAt(0).toUpperCase()+m.estado.slice(1)}</span></td>
    <td style="padding:10px 16px">
      <button class="btn btn-sm" onclick="showDtMatricula(allMatriculas.find(x=>x.id===${m.id}))" title="Ver detalle">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        Ver
      </button>
    </td>
  </tr>`).join('');
  updateMatriculaCount();
}

async function toggleMatriculaEstado(id){
  const matricula = allMatriculas.find(item=>item.id===id);
  if(!matricula) return;
  const nextStatus=matricula.estado==='activa'?'retirada':'activa';
  try{
    await academicRequest(`/api/matricula/${encodeURIComponent(id)}`,'PUT',{estado:nextStatus});
  }catch(error){
    mostrarErrorMatricula(error.message||'No se pudo actualizar el estado de la matrícula.');
    return;
  }
  matricula.estado=nextStatus;
  renderMatriculas();
}

function filterMatriculas(){ renderMatriculas(); }

function buscarMatriculaPorCodigo(){
  const input = document.getElementById('matricula-codigo-alumno');
  const mensaje = document.getElementById('matricula-consulta-mensaje');
  const resultados = document.getElementById('matricula-consulta-resultados');
  if(!input || !mensaje || !resultados) return;

  const codigo = input.value.trim();
  resultados.replaceChildren();
  if(!codigo){
    mensaje.textContent = 'El sistema solicita ingresar el código del alumno.';
    return;
  }

  const matriculas = allMatriculas.filter(m=>{
    const idAlumno = String(m.alumnoId ?? '').replace(/^alumno-/i, '');
    return idAlumno === codigo;
  });
  if(!matriculas.length){
    mensaje.textContent = 'No se encontraron registros para el código de alumno indicado.';
    return;
  }

  mensaje.textContent = `Se encontraron ${matriculas.length} ${matriculas.length === 1 ? 'matrícula' : 'matrículas'}.`;
  matriculas.forEach(m=>{
    const idAlumno = String(m.alumnoId ?? '').replace(/^alumno-/i, '');
    const alumno = allRegistros.find(r=>String(r.id).replace(/^alumno-/i, '')===idAlumno);
    const resultado = document.createElement('p');
    resultado.className = 'matricula-consulta-resultado';
    resultado.textContent = [
      `Código del alumno: ${idAlumno}`,
      `N° Matrícula: ${m.nro}`,
      `Alumno: ${m.nombre || alumno?.nombre || '—'}`,
      `DNI: ${alumno?.dni || '—'}`,
      `Sección: ${m.seccion || '—'}`,
      `Año lectivo: ${m.anio || '—'}`,
      `Estado: ${m.estado || '—'}`
    ].join(' | ');
    resultados.appendChild(resultado);
  });
}

async function saveRegistro(){
  mostrarAvisoFormulario('reg-error', '');
  mostrarAvisoFormulario('ci-reg-feedback', '');
  const nombres = document.getElementById('reg-nombres')?.value.trim() || '';
  const apellidos = document.getElementById('reg-apellidos')?.value.trim() || '';
  const tipo = document.getElementById('reg-tipo').value;
  const dni = document.getElementById('reg-dni').value.trim();
  const fechaNacimiento=document.getElementById('reg-fechanac')?.value||'';
  const nivel=document.getElementById('reg-nivel')?.value||'';
  const grado=document.getElementById('reg-grado')?.value||'';
  const seccion=document.getElementById('reg-seccion')?.value||'';
  const apoderadoNombre=document.getElementById('reg-apoderado')?.value.trim()||'';
  const apoderadoDni=document.getElementById('reg-apo-dni')?.value.trim()||'';
  const apoderadoTelefono=document.getElementById('reg-apo-tel')?.value.trim()||'';
  const validation = tipo === 'alumno'
    ? validarRegistroAlumno({nombres, apellidos, dni, fechaNacimiento, telefono:document.getElementById('reg-tel').value.trim(), apoderadoNombre, apoderadoDni, apoderadoTelefono, nivel, grado, seccion})
    : (!nombres || !apellidos ? 'Los nombres y apellidos son obligatorios.' : '');
  if(validation){
    mostrarAvisoFormulario('reg-error', validation);
    return;
  }
  const nombre = buildNombreCompleto(nombres, apellidos);
  const reg = {
    id: Date.now(),
    nombre,
    nombres,
    apellido: apellidos,
    tipo,
    dni,
    nivel,
    grado,
    seccion,
    email: tipo === 'alumno' ? document.getElementById('reg-email').value.trim() : '',
    tel: document.getElementById('reg-tel').value.trim(),
    fechanac:fechaNacimiento,
    apoderado:apoderadoNombre,
    apoDni:apoderadoDni,
    apoTel:apoderadoTelefono,
    fecha: new Date().toLocaleDateString('es-PE')
  };
  try{
    const resultado=tipo==='alumno'
      ?await guardarAlumnoEnServidor(reg)
      :await guardarPersonalEnServidor(reg);
    reg.id=resultado.id;
    if(tipo!=='alumno')reg.email=resultado.correo;
    allRegistros.push(reg);
  }catch(error){
    console.error('No se pudo guardar el registro.',error);
    mostrarAvisoFormulario('reg-error', error.message||'No se pudo guardar el registro.');
    return;
  }
  renderRegistro();
  if(tipo==='docente'&&CU?.role==='jefe')await loadAcademicManagementData();
  renderMatriculaAlumnoOptions();
  closeModal('modal-new-registro');
  ['reg-nombres','reg-apellidos','reg-dni','reg-email','reg-tel','reg-fechanac','reg-apo-dni','reg-apoderado','reg-apo-tel'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value='';
  });
  ['reg-nivel','reg-grado','reg-seccion'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.value='';
  });
  updateGradoOptions('reg-nivel','reg-grado');
}
function toggleLegacyRegistrationFields(){
  const isAlumno=document.getElementById('reg-tipo')?.value==='alumno';
  const placement=document.getElementById('reg-school-placement');
  if(placement)placement.style.display=isAlumno?'grid':'none';
  const emailField=document.getElementById('reg-email-wrap');
  if(emailField)emailField.style.display=isAlumno?'':'none';
  const personalEmailNote=document.getElementById('reg-personal-email-note');
  if(personalEmailNote)personalEmailNote.style.display=isAlumno?'none':'block';
}
// Función para el formulario inline de CI_Registro
function toggleRegistroAlumnoFields(){
  const tipo = document.getElementById('ci-reg-tipo').value;
  const isAlumno = tipo === 'alumno';
  const isDocente = tipo === 'docente';
  ['ci-reg-sexo-wrap','ci-reg-seccion-wrap','ci-reg-direccion-wrap','ci-reg-apoderado-wrap','ci-reg-fechanac-wrap'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display = isAlumno ? '' : 'none';
  });
  const docenteFields=document.getElementById('ci-reg-docente-wrap');
  if(docenteFields)docenteFields.style.display=isDocente?'flex':'none';
  const emailField=document.getElementById('ci-reg-email-wrap');
  if(emailField)emailField.style.display=isAlumno?'':'none';
  const personalEmailNote=document.getElementById('ci-reg-personal-email-note');
  if(personalEmailNote)personalEmailNote.style.display=isAlumno?'none':'block';
}
function mostrarErrorRegistro(mensaje){
  mostrarAvisoFormulario('ci-reg-error', mensaje);
}
async function submitRegistroForm(){
  mostrarAvisoFormulario('ci-reg-feedback', '');
  const nombres = document.getElementById('ci-reg-nombres')?.value.trim() || '';
  const apellidos = document.getElementById('ci-reg-apellidos')?.value.trim() || '';
  const tipo = document.getElementById('ci-reg-tipo').value;
  const dni = document.getElementById('ci-reg-dni').value.trim();
  const fechaNacimiento=document.getElementById('ci-reg-fechanac')?.value||'';
  const telefono=document.getElementById('ci-reg-tel')?.value.trim()||'';
  const apoderadoNombre=document.getElementById('ci-reg-apoderado')?.value.trim()||'';
  const apoderadoDni=document.getElementById('ci-reg-apo-dni')?.value.trim()||'';
  const apoderadoTelefono=document.getElementById('ci-reg-apo-tel')?.value.trim()||'';
  const nivel=document.getElementById('ci-reg-nivel')?.value||'';
  const grado=document.getElementById('ci-reg-grado')?.value||'';
  const seccion=document.getElementById('ci-reg-seccionletra')?.value||'';
  const selectedCourses=Array.from(document.getElementById('ci-reg-cursos')?.selectedOptions||[])
    .map(option=>option.value).filter(Boolean);
  const assignmentLevel=document.getElementById('ci-reg-docente-nivel')?.value||'';
  const assignmentGrade=document.getElementById('ci-reg-docente-grado')?.value||'';
  const assignmentSection=document.getElementById('ci-reg-docente-seccion')?.value||'';
  const assignmentPeriod=document.getElementById('ci-reg-periodo')?.value||'';
  const validation = tipo === 'alumno'
    ? validarRegistroAlumno({nombres, apellidos, dni, fechaNacimiento, telefono, apoderadoNombre, apoderadoDni, apoderadoTelefono, nivel, grado, seccion})
    : (!nombres || !apellidos ? 'Los nombres y apellidos son obligatorios.'
      : tipo==='docente'&&(!selectedCourses.length||!assignmentLevel||!assignmentGrade||!assignmentSection||!assignmentPeriod)
        ? 'Selecciona curso, nivel, grado, sección y periodo académico del docente.' : '');
  mostrarErrorRegistro(validation);
  if(validation)return;
  const nombre = buildNombreCompleto(nombres, apellidos);
  const reg = {
    id: Date.now(),
    nombre,
    nombres,
    apellido: apellidos,
    tipo,
    dni,
    fechanac: fechaNacimiento,
    sexo: document.getElementById('ci-reg-sexo')?.value||'',
    nivel,
    grado,
    seccion,
    seccionLabel:formatAcademicSection(nivel,grado,seccion),
    direccion: document.getElementById('ci-reg-direccion')?.value.trim()||'',
    email: tipo==='alumno' ? document.getElementById('ci-reg-email').value.trim() : '',
    tel: telefono,
    apoderado: apoderadoNombre,
    apoDni: apoderadoDni,
    apoTel: apoderadoTelefono,
    asignaciones: tipo==='docente'
      ? selectedCourses.map(nrcCurso=>({
        nrcCurso:Number(nrcCurso),nivel:assignmentLevel,grado:Number(assignmentGrade),
        seccion:assignmentSection,periodoAcademico:assignmentPeriod
      }))
      : [],
    fecha: new Date().toLocaleDateString('es-PE')
  };
  const button=document.querySelector("#page-registro button[onclick='submitRegistroForm()']");
  if(button)button.disabled=true;
  try{
    if(tipo==='alumno'){
      const resultado=await guardarAlumnoEnServidor(reg);
      reg.id=`alumno-${resultado.id}`;
    }else{
      const resultado=await guardarPersonalEnServidor(reg);
      reg.id=`usuario-${resultado.id}`;
      reg.email=resultado.correo;
    }
    allRegistros.push(reg);
  }catch(error){
    console.error('No se pudo guardar el registro.',error);
    mostrarErrorRegistro(error.message||'No se pudo guardar el registro.');
    return;
  }finally{
    if(button)button.disabled=false;
  }
  mostrarErrorRegistro('');
  const feedback=document.getElementById('ci-reg-feedback');
  if(feedback){
    mostrarAvisoFormulario(
      'ci-reg-feedback',
      tipo==='alumno'
        ? 'Registro guardado en la base de datos.'
        : `Personal registrado con el correo ${reg.email}. Debe cambiar la contraseña al iniciar sesión.`,
      'success'
    );
  }
  renderRegistro();
  renderMatriculaAlumnoOptions();
  updateRegistroCount();
  ['ci-reg-nombres','ci-reg-apellidos','ci-reg-dni','ci-reg-fechanac','ci-reg-direccion','ci-reg-email','ci-reg-tel','ci-reg-apoderado','ci-reg-apo-dni','ci-reg-apo-tel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['ci-reg-sexo','ci-reg-nivel','ci-reg-seccionletra','ci-reg-docente-nivel','ci-reg-docente-seccion'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const courseSelect=document.getElementById('ci-reg-cursos');
  if(courseSelect)Array.from(courseSelect.options).forEach(option=>option.selected=false);
  ['ci-reg-docente-grado','ci-reg-periodo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  toggleRegistroAlumnoFields();
  updateGradoOptions('ci-reg-nivel','ci-reg-grado');
  updateGradoOptions('ci-reg-docente-nivel','ci-reg-docente-grado');
  // Mostrar detalle del registro recién creado
  showDtRegistro(reg);
}
function showDtRegistro(reg){
  const el = document.getElementById('dt-registro-detalle');
  if(!el) return;
  const tipoBadge = t=>({alumno:'b-blue',docente:'b-green',administrativo:'b-amber'}[t]||'b-gray');
  const sexoLabel = s=>({M:'Masculino',F:'Femenino'}[s]||'—');
  const isAlumno = reg.tipo === 'alumno';
  el.innerHTML=`<div style="display:grid;gap:10px">
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Nombre</span><span style="font-size:13px;font-weight:600;color:var(--navy)">${reg.nombre}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Tipo</span><span class="badge ${tipoBadge(reg.tipo)}">${reg.tipo.charAt(0).toUpperCase()+reg.tipo.slice(1)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">DNI</span><span style="font-size:13px;color:var(--navy)">${reg.dni||'—'}</span></div>
    ${isAlumno?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Fecha de nacimiento</span><span style="font-size:13px;color:var(--navy)">${reg.fechanac||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Sexo</span><span style="font-size:13px;color:var(--navy)">${sexoLabel(reg.sexo)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Sección</span><span class="badge b-gray">${reg.seccionLabel||formatAcademicSection(reg.nivel,reg.grado,reg.seccion)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Dirección</span><span style="font-size:13px;color:var(--navy);text-align:right;max-width:60%">${reg.direccion||'—'}</span></div>`:''}
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Correo</span><span style="font-size:13px;color:var(--navy)">${reg.email||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0${isAlumno?';border-bottom:1px solid var(--border)':''}"><span style="font-size:12px;color:var(--muted)">Teléfono</span><span style="font-size:13px;color:var(--navy)">${reg.tel||'—'}</span></div>
    ${isAlumno?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Apoderado</span><span style="font-size:13px;color:var(--navy)">${reg.apoderado||'—'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="font-size:12px;color:var(--muted)">Tel. apoderado</span><span style="font-size:13px;color:var(--navy)">${reg.apoTel||'—'}</span></div>`:''}
  </div><div style="margin-top:10px;padding:8px 12px;background:var(--accent-light);border-radius:var(--r);font-size:12px;color:var(--accent)">✓ Registro guardado el ${reg.fecha}</div>`;
}
function updateRegistroCount(){
  const el = document.getElementById('registro-count');
  if(el) el.textContent = allRegistros.length+' registros';
}

function renderRegistro(){
  const el = document.getElementById('registro-list');
  const q = (document.getElementById('registro-search')?.value||'').toLowerCase();
  let data = allRegistros.filter(r=>!q||r.nombre.toLowerCase().includes(q)||r.tipo.toLowerCase().includes(q));
  if(!data.length){
    el.innerHTML='<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>No hay registros que coincidan.</p></div>';
    return;
  }
  const tipoBadge = t=>({alumno:'b-blue',docente:'b-green',administrativo:'b-amber'}[t]||'b-gray');
  el.innerHTML=data.map(r=>`<div role="button" tabindex="0" aria-label="Ver detalle del registro de ${r.nombre}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="showDtRegistro(allRegistros[${allRegistros.indexOf(r)}])">
    <div><div style="font-size:13px;font-weight:500;color:var(--navy)">${r.nombre}</div><div style="font-size:12px;color:var(--muted)">${r.email||r.tel||r.dni||'—'}</div></div>
    <div style="display:flex;align-items:center;gap:8px"><span class="badge ${tipoBadge(r.tipo)}">${r.tipo.charAt(0).toUpperCase()+r.tipo.slice(1)}</span><span style="font-size:11px;color:var(--muted)">${r.fecha}</span></div>
  </div>`).join('');
  updateRegistroCount();
}

function filterRegistro(){ renderRegistro(); }

function saveReclamo(){
  const asunto = document.getElementById('rec-asunto').value.trim();
  const desc = document.getElementById('rec-desc').value.trim();
  if(!asunto||!desc){
    mostrarAvisoFormulario('rec-error', 'Completa el asunto y la descripción para enviar el reclamo.');
    return;
  }
  mostrarAvisoFormulario('rec-error', '');
  const rec = {
    id: Date.now(),
    asunto,
    tipo: document.getElementById('rec-tipo').value,
    prioridad: document.getElementById('rec-prioridad').value,
    desc,
    autor: CU.name,
    fecha: new Date().toLocaleDateString('es-PE'),
    estado: 'pendiente'
  };
  allReclamos.push(rec);
  saveDataStore();
  renderReclamos();
  closeModal('modal-new-reclamo');
  document.getElementById('rec-asunto').value='';
  document.getElementById('rec-desc').value='';
}

function renderReclamos(){
  const el = document.getElementById('reclamo-list');
  const f = document.getElementById('reclamo-filter')?.value||'all';
  let data = allReclamos.filter(r=>f==='all'||r.estado===f);
  if(!data.length){
    el.innerHTML='<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No hay reclamos. Usa el botón para agregar uno.</p></div>';
    return;
  }
  const est = e=>({pendiente:'b-amber',revision:'b-blue',resuelto:'b-green'}[e]||'b-gray');
  const pri = p=>({normal:'',alta:'color:var(--danger)',urgente:'color:var(--danger);font-weight:700'}[p]||'');
  el.innerHTML=data.map(r=>`<div style="padding:14px;border:1px solid var(--border);border-radius:var(--r);margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">
      <div style="font-size:13px;font-weight:600;color:var(--navy)">${r.asunto}</div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <span class="badge ${est(r.estado)}">${r.estado.charAt(0).toUpperCase()+r.estado.slice(1)}</span>
        <button class="btn btn-sm" onclick="advanceReclamo(${r.id})" aria-label="Avanzar al siguiente estado del reclamo">→</button>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${r.desc.substring(0,120)}${r.desc.length>120?'...':''}</div>
    <div style="display:flex;gap:12px;font-size:11px;color:var(--muted)">
      <span>${r.tipo.charAt(0).toUpperCase()+r.tipo.slice(1)}</span>
      <span style="${pri(r.prioridad)}">⚡ ${r.prioridad.charAt(0).toUpperCase()+r.prioridad.slice(1)}</span>
      <span>${r.autor} · ${r.fecha}</span>
    </div>
  </div>`).join('');
}

function advanceReclamo(id){
  const r = allReclamos.find(x=>x.id===id);
  if(!r) return;
  const estados=['pendiente','revision','resuelto'];
  r.estado = estados[(estados.indexOf(r.estado)+1)%estados.length];
  saveDataStore();
  renderReclamos();
}

function filterReclamos(){ renderReclamos(); }

function saveSeccionEdit(){
  const aula = document.getElementById('edit-sec-aula').value.trim();
  const turno = document.getElementById('edit-sec-turno').value;
  if(aula) document.getElementById('sec-aula').textContent=aula;
  document.getElementById('sec-turno').textContent=turno;
  closeModal('modal-edit-seccion');
}

function buildSeccion(){
  // Actualizar datos de sección basados en el usuario actual
  if(CU.role==='teacher'){
    document.getElementById('sec-tutor').textContent=CU.name;
    document.getElementById('sec-grado').textContent='6-A';
    document.getElementById('sec-total').textContent=allStudents.length+' alumnos';
    // Listar alumnos
    const el = document.getElementById('seccion-alumnos-list');
    if(allStudents.length){
      el.innerHTML=allStudents.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><div class="u-av av-s" style="width:32px;height:32px;font-size:11px;flex-shrink:0">${s.initials||s.name.charAt(0)}</div><div><div style="font-size:13px;font-weight:500;color:var(--navy)">${s.name}</div><div style="font-size:12px;color:var(--muted)">${s.section||'Sin sección'}</div></div></div>`).join('');
    }
  } else if(CU.role==='student'){
    document.getElementById('sec-grado').textContent=allStudents[0]?.section||'Sin sección';
    document.getElementById('sec-total').textContent='—';
  }
}

function setAcademicOptions(selectId, items, placeholder, getValue, getLabel){
  const select=document.getElementById(selectId);
  if(!select)return;
  select.replaceChildren(new Option(placeholder,''));
  items.forEach(item=>select.add(new Option(getLabel(item),String(getValue(item)))));
}

function updateCourseList(courses){
  const list=document.getElementById('course-list');
  if(!list)return;
  list.replaceChildren();
  if(!courses.length){
    list.textContent='Aún no hay cursos registrados.';
    return;
  }
  courses.forEach(course=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)';
    const label=document.createElement('span');
    label.textContent=`${course.nrcCurso} — ${course.nombreCurso}`;
    const edit=document.createElement('button');
    edit.type='button';
    edit.className='btn btn-sm';
    edit.textContent='Editar';
    edit.addEventListener('click',()=>editAcademicCourse(course));
    row.append(label,edit);
    list.append(row);
  });
}

function updateAssignmentList(assignments, courses, teachers){
  const list=document.getElementById('assignment-list');
  if(!list)return;
  list.replaceChildren();
  if(!assignments.length){
    list.textContent='Aún no hay asignaciones registradas.';
    return;
  }
  const courseNames=new Map(courses.map(course=>[Number(course.nrcCurso),course.nombreCurso]));
  const teacherNames=new Map(teachers.map(teacher=>[
    Number(teacher.idDocente),`${teacher.nombre} ${teacher.apellido}`
  ]));
  assignments.forEach(assignment=>{
    const row=document.createElement('div');
    row.style.cssText='padding:7px 0;border-bottom:1px solid var(--border);font-size:12px';
    row.textContent=`${teacherNames.get(Number(assignment.idDocente))||'Docente'} — ${courseNames.get(Number(assignment.nrcCurso))||assignment.nombreCurso} — ${formatAcademicSection(assignment.nivel,assignment.grado,assignment.seccion)} — ${assignment.periodoAcademico}`;
    list.append(row);
  });
}

function showAcademicManagementMessage(message, isError=false){
  const feedback=document.getElementById('academic-management-feedback');
  if(!feedback)return;
  feedback.textContent=message;
  feedback.hidden=!message;
  feedback.style.color=isError?'#b91c1c':'#166534';
}

async function academicRequest(path, method='GET', payload){
  const options={method,headers:{'Content-Type':'application/json'}};
  if(payload!==undefined)options.body=JSON.stringify(payload);
  const response=await fetch(CFG.apiUrl+path,options);
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||`Error del servidor (HTTP ${response.status}).`);
  return result;
}

async function loadMatriculaCourses(){
  const courseSelect=document.getElementById('ci-mat-cursos');
  if(!courseSelect)return;
  const requestId=++matriculaCourseRequest;
  const level=document.getElementById('ci-mat-nivel')?.value||'';
  const grade=document.getElementById('ci-mat-grado')?.value||'';
  const section=document.getElementById('ci-mat-seccion')?.value||'';
  const period=document.getElementById('ci-mat-periodo')?.value||'';
  const hint=document.getElementById('ci-mat-cursos-hint');
  const maxGrade=level==='primaria'?6:level==='secundaria'?5:0;
  if(!maxGrade||!grade||Number(grade)>maxGrade||!['A','B','C'].includes(section)||!/^\d{4}-(I|II)$/.test(period)){
    setAcademicOptions('ci-mat-cursos',[],'Primero selecciona grado, sección y periodo',course=>course.nrcCurso,course=>course.nombreCurso);
    courseSelect.disabled=true;
    if(hint)hint.textContent='Selecciona grado, sección y periodo para ver los cursos con docente asignado.';
    return;
  }
  courseSelect.disabled=true;
  setAcademicOptions('ci-mat-cursos',[],'Cargando cursos...',course=>course.nrcCurso,course=>course.nombreCurso);
  try{
    const courses=await academicRequest(
      `/api/curso?nivel=${encodeURIComponent(level)}&grado=${encodeURIComponent(grade)}&seccion=${encodeURIComponent(section)}&periodo=${encodeURIComponent(period)}`
    );
    if(requestId!==matriculaCourseRequest)return;
    setAcademicOptions('ci-mat-cursos',courses,courses.length?'Selecciona cursos':'No hay cursos disponibles',course=>course.nrcCurso,course=>`${course.nombreCurso} (${course.nrcCurso})`);
    courseSelect.disabled=!courses.length;
    if(hint)hint.textContent=courses.length
      ? 'Puedes elegir varios cursos ofrecidos para este grado y periodo.'
      : 'No hay cursos con docente asignado para este grado y periodo.';
  }catch(error){
    if(requestId!==matriculaCourseRequest)return;
    setAcademicOptions('ci-mat-cursos',[],'No se pudieron cargar los cursos',course=>course.nrcCurso,course=>course.nombreCurso);
    courseSelect.disabled=true;
    if(hint)hint.textContent=error.message||'No se pudieron cargar los cursos disponibles.';
  }
}

async function loadAcademicManagementData(){
  if(!CU||CU.role!=='jefe')return false;
  try{
    const [courses, years, teachers, assignments]=await Promise.all([
      academicRequest('/api/curso'),
      academicRequest('/api/anio-academico'),
      academicRequest('/api/docente'),
      academicRequest('/api/asignacion-docente')
    ]);
    setAcademicOptions('assignment-course',courses,'Selecciona un curso',course=>course.nrcCurso,course=>`${course.nombreCurso} (${course.nrcCurso})`);
    setAcademicOptions('ci-reg-cursos',courses,'',course=>course.nrcCurso,course=>`${course.nombreCurso} (${course.nrcCurso})`);
    setAcademicOptions('ci-mat-cursos',[],'Primero selecciona grado, sección y periodo',course=>course.nrcCurso,course=>course.nombreCurso);
    document.getElementById('ci-mat-cursos').disabled=true;
    setAcademicOptions('assignment-period',years,'Selecciona un periodo',year=>year.periodoAcademico,year=>year.periodoAcademico);
    setAcademicOptions('ci-reg-periodo',years,'Selecciona un periodo',year=>year.periodoAcademico,year=>year.periodoAcademico);
    setAcademicOptions('ci-mat-periodo',years,'Selecciona un periodo',year=>year.periodoAcademico,year=>year.periodoAcademico);
    setAcademicOptions('assignment-teacher',teachers,'Selecciona un docente',teacher=>teacher.idDocente,teacher=>`${teacher.nombre} ${teacher.apellido} — ${teacher.nombreCurso}`);
    updateGradoOptions('assignment-level','assignment-grade');
    updateGradoOptions('ci-reg-docente-nivel','ci-reg-docente-grado');
    const assignmentTeacher=document.getElementById('assignment-teacher');
    const assignmentCourse=document.getElementById('assignment-course');
    const teacherById=new Map(teachers.map(teacher=>[Number(teacher.idDocente),teacher]));
    const updateTeacherCourse=()=>{
      const teacher=teacherById.get(Number(assignmentTeacher.value));
      assignmentCourse.value=teacher?String(teacher.nrcCurso):'';
      assignmentCourse.disabled=true;
    };
    assignmentTeacher.onchange=updateTeacherCourse;
    updateTeacherCourse();
    updateCourseList(courses);
    updateAssignmentList(assignments,courses,teachers);
    const yearList=document.getElementById('academic-year-list');
    if(yearList)yearList.textContent=years.length?years.map(year=>year.periodoAcademico).join(' · '):'Aún no hay periodos registrados.';
    showAcademicManagementMessage('');
    return true;
  }catch(error){
    console.error('No se pudo cargar la gestión académica.',error);
    showAcademicManagementMessage(error.message||'No se pudo cargar la gestión académica.',true);
    return false;
  }
}

async function createAcademicCourse(){
  const code=document.getElementById('course-code')?.value.trim()||'';
  const name=document.getElementById('course-name')?.value.trim()||'';
  const description=document.getElementById('course-description')?.value.trim()||'';
  if(!/^\d+$/.test(code)||!name){
    showAcademicManagementMessage('Ingresa un NRC numérico y el nombre del curso.',true);
    return;
  }
  try{
    await academicRequest('/api/curso','POST',{nrcCurso:Number(code),nombreCurso:name,descripcion:description});
    document.getElementById('course-code').value='';
    document.getElementById('course-name').value='';
    document.getElementById('course-description').value='';
    if(await loadAcademicManagementData())showAcademicManagementMessage('Curso registrado correctamente.');
  }catch(error){
    showAcademicManagementMessage(error.message,true);
  }
}

async function editAcademicCourse(course){
  const name=window.prompt('Nombre del curso:',course.nombreCurso);
  if(name===null)return;
  const normalized=name.trim();
  if(!normalized){
    showAcademicManagementMessage('El nombre del curso es obligatorio.',true);
    return;
  }
  const description=window.prompt('Descripción del curso:',course.descripcion||'');
  if(description===null)return;
  try{
    await academicRequest(`/api/curso/${encodeURIComponent(course.nrcCurso)}`,'PUT',{
      nombreCurso:normalized,
      descripcion:description.trim()
    });
    if(await loadAcademicManagementData())showAcademicManagementMessage('Curso actualizado correctamente.');
  }catch(error){
    showAcademicManagementMessage(error.message,true);
  }
}

async function createAcademicYear(){
  const period=document.getElementById('academic-period')?.value.trim()||'';
  if(!/^\d{4}-(I|II)$/.test(period)){
    showAcademicManagementMessage('Usa el formato de periodo AAAA-I o AAAA-II.',true);
    return;
  }
  try{
    await academicRequest('/api/anio-academico','POST',{periodoAcademico:period});
    document.getElementById('academic-period').value='';
    if(await loadAcademicManagementData())showAcademicManagementMessage('Periodo creado sin modificar el historial anterior.');
  }catch(error){
    showAcademicManagementMessage(error.message,true);
  }
}

async function createAcademicAssignment(){
  const payload={
    idDocente:document.getElementById('assignment-teacher')?.value,
    nrcCurso:document.getElementById('assignment-course')?.value,
    nivel:document.getElementById('assignment-level')?.value,
    grado:Number(document.getElementById('assignment-grade')?.value),
    seccion:document.getElementById('assignment-section')?.value,
    periodoAcademico:document.getElementById('assignment-period')?.value
  };
  if(Object.values(payload).some(value=>!value)){
    showAcademicManagementMessage('Selecciona docente, curso, nivel, grado, sección y periodo.',true);
    return;
  }
  try{
    await academicRequest('/api/asignacion-docente','POST',payload);
    if(await loadAcademicManagementData())showAcademicManagementMessage('Asignación registrada correctamente.');
  }catch(error){
    showAcademicManagementMessage(error.message,true);
  }
}
