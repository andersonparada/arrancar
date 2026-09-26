/**
 * Datos iniciales. Crea el usuario de soporte (superacceso) con las variables
 * SUPERACCESO_*. Con `--demo` crea además una cuenta de ejemplo para desarrollo.
 * Se puede ejecutar varias veces: no duplica lo que ya existe.
 */
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { establecerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { RegistroModulos } from '../modulos-sistema/registro-modulos.js';
import { usuariosRepositorio } from '../repositorios/usuarios.repositorio.js';
import { altaCuentaServicio } from '../servicios/alta-cuenta.servicio.js';
import { generarHashContrasena } from '../servicios/contrasenas.servicio.js';
import { grupoConexiones } from './conexion.js';

const USUARIO_DEMO = 'demo';
const CONTRASENA_DEMO = 'demo-arrancar';

async function sembrarSuperacceso(): Promise<void> {
  const { SUPERACCESO_USUARIO: usuario, SUPERACCESO_CONTRASENA: contrasena } = configuracion;
  if (!usuario || !contrasena) {
    console.log('Sin SUPERACCESO_USUARIO/SUPERACCESO_CONTRASENA: no se crea usuario de soporte.');
    return;
  }
  if (await usuariosRepositorio.buscarPorUsuario(usuario)) {
    console.log(`Usuario de soporte "${usuario}" ya existe.`);
    return;
  }
  await usuariosRepositorio.crear({
    usuario,
    nombres: 'Soporte',
    apellidos: 'Arrancar',
    hashContrasena: await generarHashContrasena(contrasena),
    esSuperacceso: true,
  });
  console.log(`Usuario de soporte creado: ${usuario}`);
}

async function sembrarDemo(): Promise<void> {
  if (await usuariosRepositorio.buscarPorUsuario(USUARIO_DEMO)) {
    console.log('La cuenta demo ya existe.');
    return;
  }
  await altaCuentaServicio.darDeAlta({
    nombreCuenta: 'Familia Demo',
    empresa: { nombre: 'Rancho El Arrancar', nit: null },
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
