import { bd, type Ejecutor } from '../base-datos/conexion.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { AsignadorDeNombreDeUsuario } from './aplicacion/asignador-de-nombre-de-usuario.js';
import { ActualizarUsuario } from './aplicacion/casos-uso/actualizar-usuario.js';
import { CambiarContrasena } from './aplicacion/casos-uso/cambiar-contrasena.js';
import { CrearUsuario } from './aplicacion/casos-uso/crear-usuario.js';
import { ListarUsuarios } from './aplicacion/casos-uso/listar-usuarios.js';
import { SugerirNombreDeUsuario } from './aplicacion/casos-uso/sugerir-nombre-de-usuario.js';
import { UsuariosControlador } from './http/usuarios.controlador.js';
import { rutasUsuarios } from './http/usuarios.rutas.js';
import { cifradorDeContrasenas } from './infraestructura/cifrador-argon2.js';
import { AccesosAEmpresasDrizzle } from './infraestructura/persistencia/accesos-a-empresas.drizzle.js';
import { CierreDeSesionesDrizzle } from './infraestructura/persistencia/cierre-de-sesiones.drizzle.js';
import { ConsultasUsuariosDrizzle } from './infraestructura/persistencia/consultas-usuarios.drizzle.js';
import { RepositorioUsuariosDrizzle } from './infraestructura/persistencia/repositorio-usuarios.drizzle.js';

export { cifradorDeContrasenas };

/** Para quien trabaja fuera de una unidad de trabajo: el inicio de sesión y la semilla. */
export const usuariosSinTransaccion = new RepositorioUsuariosDrizzle(() => bd);

/** Las piezas de usuarios dentro de una transacción ajena (la del alta de cuentas). */
export function usuariosEn(tx: Ejecutor) {
  const repositorio = new RepositorioUsuariosDrizzle(() => tx);
  return { repositorio, asignador: new AsignadorDeNombreDeUsuario({ usuarios: repositorio }) };
}

/** Raíz de composición del contexto de identidad. */
export function componerIdentidad({ unidadDeTrabajo }: DependenciasCompartidas) {
  const repositorio = new RepositorioUsuariosDrizzle();
  const accesos = new AccesosAEmpresasDrizzle();
  const asignador = new AsignadorDeNombreDeUsuario({ usuarios: repositorio });
  const sesiones = new CierreDeSesionesDrizzle(bd);
  const cifrador = cifradorDeContrasenas;
  const controlador = new UsuariosControlador({
    listar: new ListarUsuarios({ consultas: new ConsultasUsuariosDrizzle(bd) }),
    sugerirNombre: new SugerirNombreDeUsuario({ unidadDeTrabajo, asignador }),
    crear: new CrearUsuario({ unidadDeTrabajo, repositorio, accesos, asignador, cifrador }),
    actualizar: new ActualizarUsuario({ unidadDeTrabajo, repositorio, accesos, sesiones }),
    cambiarContrasena: new CambiarContrasena({ unidadDeTrabajo, repositorio, cifrador, sesiones }),
  });
  return rutasUsuarios(controlador);
}
