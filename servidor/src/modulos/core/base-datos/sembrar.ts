/**
 * Datos iniciales. Crea el usuario de soporte (superacceso) con las variables
 * SUPERACCESO_*. Con `--demo` crea además una cuenta de ejemplo para desarrollo.
 * Se puede ejecutar varias veces: no duplica lo que ya existe.
 */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { establecerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { RegistroModulos } from '../modulos-sistema/registro-modulos.js';
import { cifradorDeContrasenas, usuariosSinTransaccion } from '../identidad/contexto.js';
import { RepositorioUsuariosDrizzle } from '../identidad/infraestructura/persistencia/repositorio-usuarios.drizzle.js';
import { NombreDeUsuario } from '../identidad/dominio/nombre-de-usuario.js';
import { Usuario } from '../identidad/dominio/usuario.js';
import { darDeAltaCuenta } from '../cuentas/contexto.js';
import { grupoConexiones } from './conexion.js';

const USUARIO_DEMO = 'demo';
const CONTRASENA_DEMO = 'demo-arrancar';

/**
 * El superacceso solo lo crea el dueño de la base de datos: un disparador impide que `arrancar_app` cree o
 * promueva a nadie con `es_superacceso`. Por eso la siembra se conecta con `DATABASE_URL_PROPIETARIO`.
 */
function conexionDelPropietario(): pg.Pool {
  const url = configuracion.DATABASE_URL_PROPIETARIO;
  if (!url) throw new Error('Falta DATABASE_URL_PROPIETARIO: el usuario de soporte lo crea el dueño de la base.');
  return new pg.Pool({ connectionString: url, max: 1 });
}

async function agregarComoPropietario(soporte: Usuario): Promise<void> {
  const propietario = conexionDelPropietario();
  try {
    const bdPropietario = drizzle(propietario, { casing: 'snake_case' });
    await new RepositorioUsuariosDrizzle(() => bdPropietario).agregar(soporte);
  } finally {
    await propietario.end();
  }
}

async function sembrarSuperacceso(): Promise<void> {
  const { SUPERACCESO_USUARIO: usuario, SUPERACCESO_CONTRASENA: contrasena } = configuracion;
  if (!usuario || !contrasena) {
    console.log('Sin SUPERACCESO_USUARIO/SUPERACCESO_CONTRASENA: no se crea usuario de soporte.');
    return;
  }
  const nombreDeUsuario = NombreDeUsuario.crear(usuario);
  if (await usuariosSinTransaccion.buscarPorNombre(nombreDeUsuario)) {
    console.log(`Usuario de soporte "${usuario}" ya existe.`);
    return;
  }
  const soporte = Usuario.registrarSoporte({
    nombreDeUsuario,
    nombres: 'Soporte',
    apellidos: 'Arrancar',
    correo: null,
    hashContrasena: await cifradorDeContrasenas.cifrar(contrasena),
  });
  await agregarComoPropietario(soporte);
  console.log(`Usuario de soporte creado: ${usuario}`);
}

async function sembrarDemo(): Promise<void> {
  if (await usuariosSinTransaccion.buscarPorNombre(NombreDeUsuario.crear(USUARIO_DEMO))) {
    console.log('La cuenta demo ya existe.');
    return;
  }
  await darDeAltaCuenta.ejecutar({
    nombreCuenta: 'Familia Demo',
    empresa: { nombre: 'Empresa Demo', nit: null },
    propietario: {
      nombres: 'Dueño',
      apellidos: 'Demo',
      usuario: USUARIO_DEMO,
      correo: null,
      contrasena: CONTRASENA_DEMO,
    },
    modulos: [],
  });
  console.log(`Cuenta demo creada: ${USUARIO_DEMO} / ${CONTRASENA_DEMO}`);
}

establecerRegistroModulos(new RegistroModulos(definicionesModulos));
try {
  await sembrarSuperacceso();
  if (process.argv.includes('--demo')) await sembrarDemo();
} finally {
  await grupoConexiones.end();
}
