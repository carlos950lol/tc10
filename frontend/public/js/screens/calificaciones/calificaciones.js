function calcAvg(s){const v=[s.e1,s.e2,s.tarea,s.proyecto].filter(x=>x!==null&&x!==undefined&&x!=='');if(!v.length)return null;return Math.round(v.reduce((a,b)=>a+parseFloat(b),0)/v.length);}
function getStatus(avg){if(avg===null)return'Sin datos';if(avg>=18)return'Excelente';if(avg>=16)return'Bien';if(avg>=12)return'Aprobado';return'Desaprobado';}
function getBadge(avg){if(avg===null)return'b-gray';if(avg>=18)return'b-success';if(avg>=16)return'b-info';if(avg>=12)return'b-warning';return'b-danger';}
function getBar(avg){if(!avg)return'bf-poor';if(avg>=18)return'bf-ex';if(avg>=16)return'bf-good';if(avg>=12)return'bf-avg';return'bf-poor';}

function buildGradesHeader(){
  const isT=CU.role==='teacher';
  document.getElementById('grades-thead').innerHTML=isT
    ?'<tr><th>#</th><th>Alumno</th><th>Sección</th><th>Examen 1</th><th>Examen 2</th><th>Tareas</th><th>Proyecto</th><th>Promedio</th><th>Estado</th><th></th></tr>'
    :'<tr><th>Materia</th><th>Maestro</th><th>Examen 1</th><th>Examen 2</th><th>Tareas</th><th>Proyecto</th><th>Promedio</th><th>Estado</th></tr>';
}
function filterGrades(q){
  const search=(q||document.getElementById('grades-search').value).toLowerCase();
  const gf=document.getElementById('grades-section-filter').value;
  const sf=document.getElementById('grades-status-filter').value;
  const f=allGrades.filter(s=>{const avg=CU.role==='teacher'?(s.avgSaved==null?null:Number(s.avgSaved)):calcAvg(s);const st=getStatus(avg).toLowerCase().replace(' ','');return(!search||s.name.toLowerCase().includes(search))&&(!gf||s.sectionCode===gf)&&(!sf||st.includes(sf));});
  renderGrades(f);
}
function av(s){return'<div style="width:26px;height:26px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--accent)">'+s+'</div>';}
function renderGrades(data){
  const isT=CU.role==='teacher';const tb=document.getElementById('grades-tbody');const cols=isT?9:8;
  if(!data.length){tb.innerHTML='<tr><td colspan="'+cols+'"><div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><h3>Sin datos</h3><p>Ajusta los filtros o registra datos.</p></div></td></tr>';return;}
  if(isT){
    tb.innerHTML=data.map((s,i)=>{const avg=s.avgSaved==null?null:Number(s.avgSaved);const avgS=avg!=null?avg.toString():'—';
      return '<tr><td>'+(i+1)+'</td><td><div style="display:flex;align-items:center;gap:8px">'+av(s.initials)+'<span class="td-bold">'+s.name+'</span></div></td><td><span class="badge b-gray">'+s.section+'</span></td><td><input class="grade-input" aria-label="Examen 1 de '+s.name+'" value="'+(s.e1!=null?s.e1:'')+'" type="number" min="0" max="20" step="0.5" onchange="updGrade('+s.id+',\'e1\',this.value)"></td><td><input class="grade-input" aria-label="Examen 2 de '+s.name+'" value="'+(s.e2!=null?s.e2:'')+'" type="number" min="0" max="20" step="0.5" onchange="updGrade('+s.id+',\'e2\',this.value)"></td><td><input class="grade-input" aria-label="Tareas de '+s.name+'" value="'+(s.tarea!=null?s.tarea:'')+'" type="number" min="0" max="20" step="0.5" onchange="updGrade('+s.id+',\'tarea\',this.value)"></td><td><input class="grade-input" aria-label="Proyecto de '+s.name+'" value="'+(s.proyecto!=null?s.proyecto:'')+'" type="number" min="0" max="20" step="0.5" onchange="updGrade('+s.id+',\'proyecto\',this.value)"></td><td><div class="bar-wrap"><div class="bar-track"><div class="bar-fill '+getBar(avg)+'" style="width:'+(avg?avg*5:0)+'%"></div></div><span class="td-bold">'+avgS+'</span></div></td><td><span class="badge '+getBadge(avg)+'">'+getStatus(avg)+'</span></td><td><button class=\"btn btn-sm\" onclick=\"openEditGrade('+s.id+')\" title=\"Modificar notas\" aria-label=\"Modificar notas de '+s.name+'\" style=\"padding:5px 8px\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z\"/></svg></button></td></tr>';
    }).join('');
  } else {
    function dv(v){return v!=null&&v!==''?'<span class="gv">'+v+'</span>':'<span class="gv gv-dash">—</span>';}
    tb.innerHTML=data.map(s=>{const avg=calcAvg(s);const avgS=avg!=null?avg.toString():'—';
      return '<tr><td class="td-bold">'+(s.subject||s.name)+'</td><td style="color:var(--muted);font-size:12px">'+(s.teacher||'Docente asignado')+'</td><td>'+dv(s.e1)+'</td><td>'+dv(s.e2)+'</td><td>'+dv(s.tarea)+'</td><td>'+dv(s.proyecto)+'</td><td><div class="bar-wrap"><div class="bar-track"><div class="bar-fill '+getBar(avg)+'" style="width:'+(avg?avg*5:0)+'%"></div></div><span class="td-bold">'+avgS+'</span></div></td><td><span class="badge '+getBadge(avg)+'">'+getStatus(avg)+'</span></td></tr>';
    }).join('');
  }
}
function updGrade(id,f,v){const s=allGrades.find(x=>x.id===id);if(s)s[f]=v===''?null:parseFloat(v);}
function saveGrades(e){const btn=e.currentTarget;btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Guardado';btn.style.background='var(--success)';setTimeout(()=>{btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar';btn.style.background='';},2000);}
function exportGrades(){if(!allGrades.length){alert('Sin calificaciones para exportar.');return;}const rows=[['Nombre','Sección','E1','E2','Tareas','Proyecto','Promedio','Estado']];allGrades.forEach(s=>{const avg=calcAvg(s);rows.push([s.name,s.section,s.e1??'',s.e2??'',s.tarea??'',s.proyecto??'',avg?avg.toFixed(1):'',getStatus(avg)]);});const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n'));a.download='calificaciones.csv';a.click();}

// ══════════════════════
// CALIFICACIONES — AGREGAR ALUMNO
// ══════════════════════
let gradeStudentId = 1;

function previewAvg(){
  const e1=parseFloat(document.getElementById('ag-e1').value)||null;
  const e2=parseFloat(document.getElementById('ag-e2').value)||null;
  const t=parseFloat(document.getElementById('ag-tarea').value)||null;
  const p=parseFloat(document.getElementById('ag-proyecto').value)||null;
  const vals=[e1,e2,t,p].filter(x=>x!==null);
  const preview=document.getElementById('ag-preview');
  const avgEl=document.getElementById('ag-avg-val');
  const badgeEl=document.getElementById('ag-avg-badge');
  if(!vals.length){preview.style.display='none';return;}
  const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  preview.style.display='flex';
  avgEl.textContent=avg.toFixed(1);
  const status=avg>=18?'Excelente':avg>=16?'Bien':avg>=12?'Aprobado':'Desaprobado';
  const bc=avg>=18?'b-success':avg>=16?'b-info':avg>=12?'b-warning':'b-danger';
  badgeEl.className='badge '+bc;
  badgeEl.textContent=status;
}

function saveGradeStudent(){
  const name=document.getElementById('ag-name').value.trim();
  const sectionCode=document.getElementById('ag-section').value;
  if(!name){document.getElementById('ag-name').focus();document.getElementById('ag-name').style.borderColor='var(--danger)';return;}
  if(!sectionCode){document.getElementById('ag-section').focus();document.getElementById('ag-section').style.borderColor='var(--danger)';return;}
  document.getElementById('ag-name').style.borderColor='';
  document.getElementById('ag-section').style.borderColor='';
  const e1=document.getElementById('ag-e1').value!==''?parseFloat(document.getElementById('ag-e1').value):null;
  const e2=document.getElementById('ag-e2').value!==''?parseFloat(document.getElementById('ag-e2').value):null;
  const tarea=document.getElementById('ag-tarea').value!==''?parseFloat(document.getElementById('ag-tarea').value):null;
  const proyecto=document.getElementById('ag-proyecto').value!==''?parseFloat(document.getElementById('ag-proyecto').value):null;
  const initials=name.split(' ').map(w=>w[0]&&w[0].toUpperCase()||'').join('').slice(0,2)||'XX';
  const [nivel,grado,seccion]=sectionCode.split(':');
  allGrades.push({
    id:gradeStudentId++,name,sectionCode,
    section:formatAcademicSection(nivel,grado,seccion),initials,e1,e2,tarea,proyecto
  });
  saveDataStore();
  // Reset form
  ['ag-name','ag-e1','ag-e2','ag-tarea','ag-proyecto'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ag-section').value='';
  document.getElementById('ag-preview').style.display='none';
  closeModal('modal-add-grade-student');
  // Refresh table
  buildGradesHeader();
  filterGrades('');
  // Flash success
  showToast('Alumno registrado correctamente');
}

function showToast(msg){
  let t=document.getElementById('toast-msg');
  if(!t){
    t=document.createElement('div');
    t.id='toast-msg';
    t.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:#1E293B;color:#fff;padding:11px 22px;border-radius:30px;font-size:13.5px;font-weight:500;z-index:9000;opacity:0;transition:all .3s;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.2)';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(-50%) translateY(10px)';},2800);
}


// ══════════════════════
// EDITAR NOTAS
// ══════════════════════
let editingGradeId = null;

function openEditGrade(id){
  const s = allGrades.find(x => x.id === id);
  if(!s) return;
  editingGradeId = id;
  document.getElementById('eg-avatar').textContent = s.initials;
  document.getElementById('eg-name').textContent = s.name;
  document.getElementById('eg-section').textContent = 'Sección ' + s.section;
  document.getElementById('eg-e1').value = s.e1 != null ? s.e1 : '';
  document.getElementById('eg-e2').value = s.e2 != null ? s.e2 : '';
  document.getElementById('eg-tarea').value = s.tarea != null ? s.tarea : '';
  document.getElementById('eg-proyecto').value = s.proyecto != null ? s.proyecto : '';
  previewEditAvg();
  openModal('modal-edit-grade');
}

function previewEditAvg(){
  const avgEl = document.getElementById('eg-avg-val');
  const badgeEl = document.getElementById('eg-avg-badge');
  const saved=allGrades.find(item=>item.id===editingGradeId)?.avgSaved;
  if(saved==null){avgEl.textContent='—';badgeEl.textContent='—';badgeEl.className='badge b-gray';return;}
  const avg=Number(saved);
  avgEl.textContent=avg.toFixed(2);
  const status = avg>=18?'Excelente':avg>=16?'Bien':avg>=12?'Aprobado':'Desaprobado';
  const bc = avg>=18?'b-success':avg>=16?'b-info':avg>=12?'b-warning':'b-danger';
  badgeEl.className = 'badge ' + bc;
  badgeEl.textContent = status;
}

async function saveEditGrade(){
  const s = allGrades.find(x => x.id === editingGradeId);
  if(!s) return;
  const e1v = document.getElementById('eg-e1').value;
  const e2v = document.getElementById('eg-e2').value;
  const tv  = document.getElementById('eg-tarea').value;
  const pv  = document.getElementById('eg-proyecto').value;
  s.e1      = e1v !== '' ? parseFloat(e1v) : null;
  s.e2      = e2v !== '' ? parseFloat(e2v) : null;
  s.tarea   = tv  !== '' ? parseFloat(tv)  : null;
  s.proyecto= pv  !== '' ? parseFloat(pv)  : null;
  if(await guardarNotasProfesor()){
    closeModal('modal-edit-grade');
    showToast('Notas de ' + s.name + ' actualizadas correctamente');
  }
}

async function loadGradesAssignment(){
  const assignmentId=document.getElementById('grades-assignment-filter')?.value;
  if(!assignmentId)return;
  try{
    const response=await fetch(`${CFG.apiUrl}/api/calificacion?idAsignacion=${encodeURIComponent(assignmentId)}`);
    const rows=await response.json();
    if(!response.ok)throw new Error(rows.error||'No se pudieron cargar las calificaciones.');
    const students=new Map();
    const fields=['e1','e2','tarea','proyecto'];
    const fixedTypes={'Examen 1':'e1','Practica 1':'e1','Parcial':'e2','Examen 2':'e2','Tareas':'tarea','Tarea':'tarea','Proyecto':'proyecto'};
    rows.forEach(row=>{
      if(!students.has(row.idAlumno)){
        const name=`${row.nombre} ${row.apellido}`.trim();
        students.set(row.idAlumno,{
          id:row.idAlumno,name,initials:name.split(/\s+/).map(part=>part[0]||'').join('').slice(0,2).toUpperCase(),
          section:formatAcademicSection(row.nivel,row.grado,row.seccion),
          sectionCode:`${row.nivel}:${row.grado}:${row.seccion}`,e1:null,e2:null,tarea:null,proyecto:null,
          avgSaved:row.promedio==null?null:Number(row.promedio)
        });
      }
      if(row.tipoEvaluacion){
        const student=students.get(row.idAlumno);
        const field=fixedTypes[row.tipoEvaluacion]||fields.find(key=>student[key]==null);
        if(field)student[field]=Number(row.nota);
      }
    });
    allGrades=Array.from(students.values());
    filterGrades('');
  }catch(error){
    console.error('No se pudieron cargar las calificaciones.',error);
    showToast(error.message||'No se pudieron cargar las calificaciones.');
  }
}

async function guardarNotasProfesor(event){
  const idAsignacion=Number(document.getElementById('grades-assignment-filter')?.value);
  if(!idAsignacion){showToast('Selecciona curso, grado y año académico.');return;}
  const records=[];
  const types={e1:'Examen 1',e2:'Examen 2',tarea:'Tareas',proyecto:'Proyecto'};
  for(const student of allGrades){
    for(const [field,tipoEvaluacion] of Object.entries(types)){
      const value=student[field];
      if(value===null||value===undefined||value==='')continue;
      const nota=Number(value);
      if(!Number.isFinite(nota)||nota<0||nota>20){
        showToast(`La nota de ${student.name} debe estar entre 0 y 20.`);
        return;
      }
      records.push({idAlumno:student.id,tipoEvaluacion,nota});
    }
  }
  if(!records.length){showToast('Ingresa al menos una nota antes de guardar.');return;}
  const button=event?.currentTarget||document.querySelector('#page-calificaciones button[onclick="guardarNotasProfesor(event)"]');
  if(button)button.disabled=true;
  try{
    const response=await fetch(CFG.apiUrl+'/api/calificacion',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({idAsignacion,registros:records})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'No se pudieron guardar las calificaciones.');
    const averages=new Map((result.promedios||[]).map(item=>[item.idAlumno,Number(item.promedio)]));
    allGrades.forEach(student=>{
      if(averages.has(student.id))student.avgSaved=averages.get(student.id);
    });
    filterGrades('');
    showToast('Notas y promedios guardados correctamente.');
  }catch(error){
    console.error('No se pudieron guardar las calificaciones.',error);
    showToast(error.message||'No se pudieron guardar las calificaciones.');
  }finally{
    if(button)button.disabled=false;
  }
}

