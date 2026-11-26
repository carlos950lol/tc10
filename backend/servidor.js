const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const { pool, obtenerDatosDashboard, mysqlUnavailable } = require('./consultas');
const { registrarAlumno } = require('./servicios/alumnos');
const {
  listarAsignaciones,
  obtenerListaAsignacion,
  obtenerHistorialAsistencia,
  obtenerCalificacionesAsignacion,
  guardarAsistencias,
  guardarCalificaciones,
  registrarMatricula
} = require('./servicios/academicos');
const scryptAsync = promisify(scrypt);

const PORT = Number(process.env.API_PORT || 3001);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const VIEWS_DIR = path.join(PROJECT_ROOT, 'frontend', 'views');
const SCREEN_NAMES = [
  'dashboard', 'calificaciones', 'asistencia', 'tareas', 'alumnos', 'horario',
  'avisos', 'mensajes', 'perfil', 'seccion', 'reclamo', 'registro', 'matricula'
];
const MODAL_GROUP_NAMES = [
  'shared', 'matricula', 'registro', 'reclamo', 'seccion', 'tareas', 'mensajes',
  'avisos', 'alumnos', 'perfil', 'horario', 'calificaciones'
];
const SESSION_COOKIE = 'academia_session';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const sessions = new Map();

const tablas = new Set([
  'alumno', 'docente', 'curso', 'seccion', 'matricula', 'calificacion',
  'asistencia', 'reclamo', 'respuesta_reclamo', 'pago', 'constancia', 'usuario', 'tarea'
]);
const claves = {
  alumno: 'idAlumno', docente: 'idDocente', curso: 'nrcCurso', seccion: 'idSeccion',
  matricula: 'idMatricula', calificacion: 'idCalificacion', asistencia: 'idAsistencia',
  reclamo: 'idReclamo', respuesta_reclamo: 'idRespuesta', pago: 'idPago', constancia: 'idConstancia',
  usuario: 'idUsuario', tarea: 'idTarea'
};

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    ...headers
  });
  res.end(JSON.stringify(body));
}
function sessionToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith(`${SESSION_COOKIE}=`));
  return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : '';
}
function getSession(req) {
  const token = sessionToken(req);
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}
async function serveDashboard(res) {
  try {
    let contenido = await fs.promises.readFile(path.join(VIEWS_DIR, 'dashboard.html'), 'utf8');
    const fragments = await Promise.all([
      ...SCREEN_NAMES.map(name => fs.promises.readFile(path.join(VIEWS_DIR, 'screens', `${name}.html`), 'utf8')),
      ...MODAL_GROUP_NAMES.map(name => fs.promises.readFile(path.join(VIEWS_DIR, 'modals', `${name}.html`), 'utf8'))
    ]);
    SCREEN_NAMES.forEach((name, index) => {
      const marker = `<!-- SCREEN:${name} -->`;
      if (contenido.split(marker).length - 1 !== 1) throw new Error(`Marcador de pantalla inválido: ${name}`);
      contenido = contenido.replace(marker, fragments[index]);
    });
    const modalMarker = '<!-- MODALS -->';
    if (contenido.split(modalMarker).length - 1 !== 1) throw new Error('Marcador de modales inválido');
    contenido = contenido.replace(modalMarker, fragments.slice(SCREEN_NAMES.length).join('\n'));
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(contenido);
  } catch (error) {
    console.error('No se pudo componer el dashboard:', error);
    json(res, 500, {error: 'No se pudo cargar el dashboard'});
  }
}
function serveAsset(res, pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  const directorioPublico = path.join(PROJECT_ROOT, 'frontend', 'public');
  const archivo = path.normalize(path.join(directorioPublico, relativePath));
  if (!archivo.startsWith(directorioPublico + path.sep)) return json(res, 403, {error: 'Archivo no permitido'});
  const extension = path.extname(archivo).toLowerCase();
  const tipos = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.png': 'image/png'
  };
  const tipo = tipos[extension];
  if (!tipo) return json(res, 404, {error: 'Recurso no encontrado'});
  fs.readFile(archivo, (error, contenido) => {
    if (error) return json(res, 404, {error: 'Recurso no encontrado'});
    const cacheControl = extension === '.jpg' || extension === '.png'
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';
    res.writeHead(200, {'Content-Type': tipo, 'Cache-Control': cacheControl});
    res.end(contenido);
  });
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } });
    req.on('error', reject);
  });
}
function tableFrom(pathname) {
  const value = pathname.replace(/^\/api\//, '').replace(/\/$/, '').replace(/-/g, '_');
  return tablas.has(value) ? value : null;
}
async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    const supplied = Buffer.from(String(password));
    const existing = Buffer.from(String(stored || ''));
    return supplied.length === existing.length && timingSafeEqual(supplied, existing);
  }
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
function publicUser(user) {
  return {
    id: user.idUsuario,
    email: user.correo,
    name: user.nombre,
    role: user.rol,
    idAlumno: user.idAlumno,
    idDocente: user.idDocente,
    mustChangePassword: Boolean(user.debeCambiarContrasena)
  };
}
function canAccessPath(session, pathname, method) {
  if (pathname === '/api/dashboard' && method === 'GET') return true;
  if (pathname === '/api/alumno' && method === 'POST') return ['jefe', 'registrador'].includes(session.role);
  if (pathname === '/api/personal' && method === 'POST') return session.role === 'jefe';
  if (pathname.startsWith('/api/curso') || pathname.startsWith('/api/asignacion-docente') ||
      pathname.startsWith('/api/anio-academico')) {
    return session.role === 'jefe' || (session.role === 'teacher' && method === 'GET');
  }
  if (pathname.startsWith('/api/asistencia') || pathname.startsWith('/api/calificacion')) {
    return session.role === 'teacher' || (session.role === 'student' && method === 'GET');
  }
  if (pathname.startsWith('/api/matricula')) return session.role === 'jefe' && method === 'GET';
  return false;
}
async function hashLegacyPasswords() {
  const [accounts] = await pool.query(
    "SELECT idUsuario, contrasena FROM usuario WHERE contrasena NOT LIKE 'scrypt$%'"
  );
  for (const account of accounts) {
    await pool.query(
      'UPDATE usuario SET contrasena = ? WHERE idUsuario = ? AND contrasena = ?',
      [await hashPassword(String(account.contrasena)), account.idUsuario, account.contrasena]
    );
  }
}

async function request(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'});
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if ((url.pathname === '/' || url.pathname === '/dashboard.html') && req.method === 'GET') {
      return serveDashboard(res);
    }
    if ((url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/images/')) && req.method === 'GET') {
      return serveAsset(res, url.pathname);
    }
    if (url.pathname === '/api/salud' && req.method === 'GET') {
      try {
        const [rows] = await pool.query('SELECT 1 AS conectado');
        return json(res, 200, {ok: true, mysql: rows[0].conectado === 1, baseDatos: process.env.MYSQL_DATABASE || 'sistema_academico'});
      } catch (error) {
        return json(res, 200, {
          ok: true,
          mysql: false,
          baseDatos: process.env.MYSQL_DATABASE || 'sistema_academico',
          fallback: true,
          mensaje: 'MySQL no disponible; el dashboard continua en modo local.'
        });
      }
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const credentials = await body(req);
      const email = String(credentials.email || '').trim().toLowerCase();
      const role = String(credentials.role || '');
      const [users] = await pool.query(
        `SELECT idUsuario, correo, contrasena, nombre, rol, idAlumno, idDocente,
                debeCambiarContrasena
         FROM usuario
         WHERE LOWER(correo) = ? AND rol = ? AND estado = 'activo'
         LIMIT 1`,
        [email, role]
      );
      const user = users[0];
      if (!user || !(await verifyPassword(String(credentials.password || ''), user.contrasena))) {
        return json(res, 401, {ok: false, error: 'Credenciales incorrectas.'});
      }
      if (!String(user.contrasena).startsWith('scrypt$')) {
        await pool.query('UPDATE usuario SET contrasena = ? WHERE idUsuario = ?', [
          await hashPassword(String(credentials.password)),
          user.idUsuario
        ]);
      }

      const now = Date.now();
      for (const [token, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(token);
      }
      const token = randomBytes(32).toString('hex');
      sessions.set(token, {
        role: user.rol, idUsuario: user.idUsuario, idAlumno: user.idAlumno,
        idDocente: user.idDocente,
        mustChangePassword: Boolean(user.debeCambiarContrasena),
        expiresAt: now + SESSION_TTL
      });
      return json(res, 200, {ok: true, user: publicUser(user)}, {
        'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`
      });
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') {
      sessions.delete(sessionToken(req));
      return json(res, 200, {ok: true}, {
        'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
      });
    }
    const session = getSession(req);
    if (url.pathname.startsWith('/api/') && !session) {
      return json(res, 401, {error: 'Se requiere iniciar sesión.'});
    }
    if (url.pathname === '/api/cambiar-contrasena' && req.method === 'POST') {
      const credentials = await body(req);
      const password = String(credentials.password || '');
      if (password.length < 10 || password.length > 128) {
        return json(res, 400, {error: 'La contraseña debe tener entre 10 y 128 caracteres.'});
      }
      await pool.query(
        'UPDATE usuario SET contrasena = ?, debeCambiarContrasena = 0 WHERE idUsuario = ?',
        [await hashPassword(password), session.idUsuario]
      );
      session.mustChangePassword = false;
      return json(res, 200, {ok: true, mensaje: 'Contraseña actualizada.'});
    }
    if (session.mustChangePassword) {
      return json(res, 403, {error: 'Debes cambiar tu contraseña antes de continuar.', mustChangePassword: true});
    }
    if (url.pathname === '/api/dashboard' && req.method === 'GET') {
      try {
        return json(res, 200, await obtenerDatosDashboard(session));
      } catch (error) {
        if (mysqlUnavailable(error)) {
          return json(res, 503, {error: 'Base de datos no disponible.'});
        }
        throw error;
      }
    }
    if (url.pathname === '/api/alumno' && req.method === 'POST') {
      if (!['jefe', 'registrador'].includes(session.role)) {
        return json(res, 403, {error: 'Tu rol no tiene permiso para registrar alumnos.'});
      }
      try {
        const result = await registrarAlumno(pool, await body(req));
        if (result.status) {
          return json(res, result.status, {error: result.error});
        }
        return json(res, 201, {id: result.id, mensaje: 'Alumno registrado.'});
      } catch (error) {
        if (mysqlUnavailable(error)) {
          return json(res, 503, {error: 'Base de datos no disponible.'});
        }
        throw error;
      }
    }
    if (url.pathname === '/api/personal' && req.method === 'POST') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede registrar personal.'});
      const data = await body(req);
      const role = String(data.rol || '');
      const name = String(data.nombre || '').trim();
      const surname = String(data.apellido || '').trim();
      const email = String(data.correo || '').trim().toLowerCase();
      if (!['teacher', 'registrador'].includes(role)) return json(res, 400, {error: 'El rol de personal no es válido.'});
      if (!name || !surname || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(res, 400, {error: 'Nombres, apellidos y un correo válido son obligatorios.'});
      }
      const defaultPassword = process.env.PERSONAL_DEFAULT_PASSWORD;
      if (!defaultPassword || defaultPassword.length < 10) {
        return json(res, 503, {error: 'Configura PERSONAL_DEFAULT_PASSWORD con al menos 10 caracteres antes de registrar personal.'});
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        let idDocente = null;
        if (role === 'teacher') {
          if (!Array.isArray(data.asignaciones) || !data.asignaciones.length) {
            await connection.rollback();
            return json(res, 400, {error: 'Selecciona al menos un curso, grado y periodo para el docente.'});
          }
          const seenAssignments = new Set();
          for (const assignment of data.asignaciones) {
            const group = String(assignment.grupo || '');
            const period = String(assignment.periodoAcademico || '');
            const courseId = Number(assignment.nrcCurso);
            if (!Number.isInteger(courseId) || !/^[AB][1-6]$/.test(group) || !/^\d{4}-(I|II)$/.test(period)) {
              await connection.rollback();
              return json(res, 400, {error: 'Una de las asignaciones del docente no es válida.'});
            }
            const assignmentKey = `${courseId}:${group}:${period}`;
            if (seenAssignments.has(assignmentKey)) {
              await connection.rollback();
              return json(res, 400, {error: 'No repitas la misma asignación de curso, grado y periodo.'});
            }
            seenAssignments.add(assignmentKey);
            const [existingReferences] = await connection.query(
              `SELECT c.nrcCurso, aa.periodoAcademico
               FROM curso c CROSS JOIN anio_academico aa
               WHERE c.nrcCurso = ? AND aa.periodoAcademico = ? LIMIT 1`,
              [courseId, period]
            );
            if (!existingReferences.length) {
              await connection.rollback();
              return json(res, 400, {error: 'Registra el curso y el periodo académico antes de asignar al docente.'});
            }
          }
          const [teacher] = await connection.query(
            'INSERT INTO docente (nombre, apellido, correo, telefono, estado) VALUES (?, ?, ?, ?, ?)',
            [name, surname, email, data.telefono || null, 'activo']
          );
          idDocente = teacher.insertId;
        }
        const [account] = await connection.query(
          `INSERT INTO usuario
             (correo, contrasena, nombre, rol, idDocente, estado, debeCambiarContrasena)
           VALUES (?, ?, ?, ?, ?, 'activo', 1)`,
          [email, await hashPassword(defaultPassword), `${name} ${surname}`, role, idDocente]
        );
        if (role === 'teacher') {
          for (const assignment of data.asignaciones) {
            await connection.query(
              `INSERT INTO asignacion_docente (idDocente, nrcCurso, grupo, periodoAcademico)
               VALUES (?, ?, ?, ?)`,
              [idDocente, Number(assignment.nrcCurso), assignment.grupo, assignment.periodoAcademico]
            );
          }
        }
        await connection.commit();
        return json(res, 201, {id: account.insertId, mensaje: 'Personal registrado. Debe cambiar la contraseña al iniciar sesión.'});
      } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') return json(res, 409, {error: 'El correo ya está registrado.'});
        throw error;
      } finally {
        connection.release();
      }
    }
    if (url.pathname === '/api/curso' && req.method === 'GET') {
      if (!['jefe', 'teacher'].includes(session.role)) return json(res, 403, {error: 'Tu rol no puede consultar cursos.'});
      const [rows] = session.role === 'teacher'
        ? await pool.query(
          `SELECT DISTINCT c.* FROM curso c
           INNER JOIN asignacion_docente ad ON ad.nrcCurso = c.nrcCurso
           WHERE ad.idDocente = ? AND ad.estado = 'activa'
           ORDER BY c.nombreCurso`,
          [session.idDocente]
        )
        : await pool.query('SELECT * FROM curso ORDER BY nombreCurso');
      return json(res, 200, rows);
    }
    if (url.pathname === '/api/docente' && req.method === 'GET') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede consultar docentes.'});
      const [rows] = await pool.query(
        `SELECT idDocente, nombre, apellido, correo, estado
         FROM docente ORDER BY apellido, nombre`
      );
      return json(res, 200, rows);
    }
    if (url.pathname === '/api/curso' && req.method === 'POST') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede gestionar cursos.'});
      const data = await body(req);
      const nrcCurso = Number(data.nrcCurso);
      const nombreCurso = String(data.nombreCurso || '').trim();
      if (!Number.isInteger(nrcCurso) || nrcCurso <= 0 || !nombreCurso || nombreCurso.length > 150) {
        return json(res, 400, {error: 'El código y nombre del curso son obligatorios y deben ser válidos.'});
      }
      const [duplicates] = await pool.query(
        'SELECT nrcCurso FROM curso WHERE nrcCurso = ? OR LOWER(nombreCurso) = LOWER(?) LIMIT 1',
        [nrcCurso, nombreCurso]
      );
      if (duplicates.length) return json(res, 409, {error: 'Ya existe un curso con ese código o nombre.'});
      const [result] = await pool.query(
        `INSERT INTO curso (nrcCurso, nombreCurso, descripcion, creditos, horasSemanal, estado)
         VALUES (?, ?, ?, ?, ?, 'activo')`,
        [nrcCurso, nombreCurso, data.descripcion || null, data.creditos || null, data.horasSemanal || null]
      );
      return json(res, 201, {id: result.insertId || nrcCurso, mensaje: 'Curso registrado.'});
    }
    const courseMatch = /^\/api\/curso\/(\d+)$/.exec(url.pathname);
    if (courseMatch && req.method === 'PUT') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede gestionar cursos.'});
      const data = await body(req);
      const allowed = {nombreCurso: 'nombreCurso', descripcion: 'descripcion', creditos: 'creditos', horasSemanal: 'horasSemanal', estado: 'estado'};
      const columns = Object.keys(allowed).filter(key => Object.prototype.hasOwnProperty.call(data, key));
      if (!columns.length) return json(res, 400, {error: 'No hay campos válidos para actualizar.'});
      if (data.nombreCurso !== undefined && !String(data.nombreCurso).trim()) {
        return json(res, 400, {error: 'El nombre del curso es obligatorio.'});
      }
      const values = columns.map(key => key === 'nombreCurso' ? String(data[key]).trim() : data[key]);
      const [result] = await pool.query(
        `UPDATE curso SET ${columns.map(key => `\`${allowed[key]}\` = ?`).join(', ')} WHERE nrcCurso = ?`,
        [...values, Number(courseMatch[1])]
      );
      if (!result.affectedRows) return json(res, 404, {error: 'Curso no encontrado.'});
      return json(res, 200, {mensaje: 'Curso actualizado.'});
    }
    if (url.pathname === '/api/anio-academico' && req.method === 'GET') {
      if (!['jefe', 'teacher'].includes(session.role)) return json(res, 403, {error: 'Tu rol no puede consultar años académicos.'});
      const [rows] = await pool.query('SELECT * FROM anio_academico ORDER BY periodoAcademico DESC');
      return json(res, 200, rows);
    }
    if (url.pathname === '/api/anio-academico' && req.method === 'POST') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede gestionar años académicos.'});
      const data = await body(req);
      const periodo = String(data.periodoAcademico || '').trim();
      if (!/^\d{4}-(I|II)$/.test(periodo)) return json(res, 400, {error: 'El periodo debe tener formato AAAA-I o AAAA-II.'});
      try {
        await pool.query(
          'INSERT INTO anio_academico (periodoAcademico, estado, fechaInicio, fechaFin) VALUES (?, ?, ?, ?)',
          [periodo, 'activo', data.fechaInicio || null, data.fechaFin || null]
        );
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return json(res, 409, {error: 'Ese periodo académico ya existe.'});
        throw error;
      }
      return json(res, 201, {periodoAcademico: periodo, mensaje: 'Año académico creado sin afectar el historial.'});
    }
    if (url.pathname === '/api/asignacion-docente' && req.method === 'GET') {
      if (!['jefe', 'teacher'].includes(session.role)) return json(res, 403, {error: 'Tu rol no puede consultar asignaciones.'});
      return json(res, 200, await listarAsignaciones(pool, session));
    }
    if (url.pathname === '/api/asignacion-docente' && req.method === 'POST') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede gestionar asignaciones.'});
      const data = await body(req);
      const idDocente = Number(data.idDocente);
      const nrcCurso = Number(data.nrcCurso);
      const grupo = String(data.grupo || '').trim();
      const periodo = String(data.periodoAcademico || '').trim();
      if (!Number.isInteger(idDocente) || !Number.isInteger(nrcCurso) ||
          !/^[AB][1-6]$/.test(grupo) || !/^\d{4}-(I|II)$/.test(periodo)) {
        return json(res, 400, {error: 'Selecciona un docente, curso, grado y periodo académico válidos.'});
      }
      try {
        const [result] = await pool.query(
          `INSERT INTO asignacion_docente (idDocente, nrcCurso, grupo, periodoAcademico)
           VALUES (?, ?, ?, ?)`,
          [idDocente, nrcCurso, grupo, periodo]
        );
        return json(res, 201, {id: result.insertId, mensaje: 'Asignación registrada.'});
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return json(res, 409, {error: 'La asignación ya existe.'});
        if (error.code === 'ER_NO_REFERENCED_ROW_2') return json(res, 400, {error: 'El docente, curso o periodo no existe.'});
        throw error;
      }
    }
    if (url.pathname === '/api/asistencia/alumnos' && req.method === 'GET') {
      if (session.role !== 'teacher') return json(res, 403, {error: 'Solo los docentes pueden consultar listas de asistencia.'});
      const idAsignacion = Number(url.searchParams.get('idAsignacion'));
      const fecha = String(url.searchParams.get('fecha') || new Date().toISOString().slice(0, 10));
      if (!Number.isInteger(idAsignacion) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return json(res, 400, {error: 'La asignación y fecha deben ser válidas.'});
      }
      return json(res, 200, await obtenerListaAsignacion(pool, session, idAsignacion, fecha));
    }
    if (url.pathname === '/api/asistencia' && req.method === 'GET') {
      if (session.role !== 'teacher') return json(res, 403, {error: 'Solo los docentes pueden consultar este historial.'});
      const idAsignacion = Number(url.searchParams.get('idAsignacion'));
      if (!Number.isInteger(idAsignacion)) return json(res, 400, {error: 'La asignación es obligatoria.'});
      return json(res, 200, await obtenerHistorialAsistencia(pool, session, idAsignacion));
    }
    if (url.pathname === '/api/asistencia' && req.method === 'POST') {
      if (session.role !== 'teacher') return json(res, 403, {error: 'Solo los docentes pueden registrar asistencia.'});
      const result = await guardarAsistencias(pool, session, await body(req));
      return json(res, result.status || 200, result.status ? {error: result.error} : result);
    }
    if (url.pathname === '/api/calificacion' && req.method === 'GET') {
      if (session.role === 'student') {
        const [rows] = await pool.query(
          `SELECT cal.*, c.nombreCurso, d.nombre AS nombreDocente, d.apellido AS apellidoDocente
           FROM calificacion cal
           INNER JOIN curso c ON c.nrcCurso = cal.nrcCurso
           LEFT JOIN docente d ON d.idDocente = cal.idDocente
           WHERE cal.idAlumno = ?
           ORDER BY cal.periodoAcademico DESC, c.nombreCurso, cal.fecha`,
          [session.idAlumno]
        );
        return json(res, 200, rows);
      }
      if (session.role !== 'teacher') return json(res, 403, {error: 'Tu rol no puede consultar calificaciones.'});
      const idAsignacion = Number(url.searchParams.get('idAsignacion'));
      if (!Number.isInteger(idAsignacion)) return json(res, 400, {error: 'La asignación es obligatoria.'});
      return json(res, 200, await obtenerCalificacionesAsignacion(pool, session, idAsignacion));
    }
    if (url.pathname === '/api/calificacion' && req.method === 'POST') {
      if (session.role !== 'teacher') return json(res, 403, {error: 'Solo los docentes pueden registrar calificaciones.'});
      const result = await guardarCalificaciones(pool, session, await body(req));
      return json(res, result.status || 200, result.status ? {error: result.error} : result);
    }
    if (url.pathname === '/api/matricula' && req.method === 'POST') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede registrar matrículas.'});
      const result = await registrarMatricula(pool, await body(req));
      return json(res, result.status || 201, result.status ? {error: result.error} : result);
    }
    const enrollmentMatch = /^\/api\/matricula\/(\d+)$/.exec(url.pathname);
    if (enrollmentMatch && req.method === 'PUT') {
      if (session.role !== 'jefe') return json(res, 403, {error: 'Solo el jefe académico puede actualizar matrículas.'});
      const data = await body(req);
      const status = String(data.estado || '');
      if (!['activa', 'retirada'].includes(status)) {
        return json(res, 400, {error: 'El estado debe ser activa o retirada.'});
      }
      const [result] = await pool.query(
        'UPDATE matricula SET estado = ? WHERE idMatricula = ?',
        [status, Number(enrollmentMatch[1])]
      );
      if (!result.affectedRows) return json(res, 404, {error: 'No se encontró la matrícula.'});
      return json(res, 200, {mensaje: 'Estado de matrícula actualizado.', estado: status});
    }
    if (!canAccessPath(session, url.pathname, req.method)) {
      return json(res, 403, {error: 'Tu rol no tiene permiso para realizar esta operación.'});
    }
    const tabla = tableFrom(url.pathname);
    if (!tabla) return json(res, 404, {error: 'Ruta no encontrada'});
    if (tabla === 'matricula' && session.role !== 'jefe') {
      return json(res, 403, {error: 'Tu rol no tiene permiso para acceder a matrículas.'});
    }

    if (req.method === 'GET') {
      try {
        const limite = Math.min(Number(url.searchParams.get('limite') || 100), 500);
        const [rows] = await pool.query(`SELECT * FROM \`${tabla}\` ORDER BY \`${claves[tabla]}\` DESC LIMIT ?`, [limite]);
        return json(res, 200, rows);
      } catch (error) {
        if (mysqlUnavailable(error)) return json(res, 503, {error: 'Base de datos no disponible.'});
        throw error;
      }
    }
    if (req.method === 'POST') {
      try {
        const data = await body(req);
        const columnas = Object.keys(data).filter(key => key !== claves[tabla] && /^[A-Za-z][A-Za-z0-9]*$/.test(key));
        if (!columnas.length) return json(res, 400, {error: 'No hay campos para insertar'});
        const valores = columnas.map(key => data[key]);
        const marcas = columnas.map(() => '?').join(', ');
        const [result] = await pool.query(`INSERT INTO \`${tabla}\` (${columnas.map(key => `\`${key}\``).join(', ')}) VALUES (${marcas})`, valores);
        return json(res, 201, {id: result.insertId, mensaje: 'Registro creado'});
      } catch (error) {
        if (mysqlUnavailable(error)) return json(res, 200, {ok: false, fallback: true, mensaje: 'MySQL no disponible; la operación se guardó solo en modo local.'});
        throw error;
      }
    }
    return json(res, 405, {error: 'Metodo no permitido'});
  } catch (error) {
    if (mysqlUnavailable(error)) {
      return json(res, 503, {error: 'Base de datos no disponible.'});
    }
    console.error(error.message);
    return json(res, 500, {error: 'Error de base de datos', detalle: error.message});
  }
}

const server = http.createServer(request);
server.listen(PORT, () => {
  console.log(`API academica disponible en http://localhost:${PORT}`);
  hashLegacyPasswords().catch(error => {
    console.error('No se pudieron convertir las contraseñas heredadas a hash:', error.message);
  });
});
