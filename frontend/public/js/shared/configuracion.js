
const CFG={
  name:'Academia Decam',
  apiUrl:window.location.origin,
  academicLevels:[
    {value:'primaria',label:'Primaria',maxGrade:6},
    {value:'secundaria',label:'Secundaria',maxGrade:5}
  ],
  sectionLetters:['A','B','C'],
  academicSections:[
    ...Array.from({length:6},(_,index)=>({nivel:'primaria',grado:index+1})),
    ...Array.from({length:5},(_,index)=>({nivel:'secundaria',grado:index+1}))
  ].flatMap(grade=>['A','B','C'].map(seccion=>({
    ...grade,
    seccion,
    value:`${grade.nivel}:${grade.grado}:${seccion}`,
    label:`${grade.nivel==='primaria'?'Primaria':'Secundaria'} ${grade.grado}° - Sección ${seccion}`
  }))),
  directorio:[
    {label:'Direccion',val:'Ext. 100',icon:'ti-phone'},
    {label:'Orientacion',val:'Ext. 205',icon:'ti-phone'},
    {label:'Enfermeria',val:'Ext. 110',icon:'ti-phone'},
    {label:'Contacto',val:'info@miescuela.edu.mx',icon:'ti-mail'}
  ]
};

function formatAcademicSection(nivel, grado, seccion){
  if(!nivel||!grado||!seccion)return 'Sin sección';
  return `${nivel==='primaria'?'Primaria':'Secundaria'} ${grado}° ${seccion}`;
}
