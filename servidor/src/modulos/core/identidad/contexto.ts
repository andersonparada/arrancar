import type { FastifyPluginAsync } from 'fastify';
import { configuracion as ajustesDelServidor } from '../../../configuracion.js';
import { consultasRoles } from '../autorizacion/contexto.js';
import { bd, type Ejecutor } from '../base-datos/conexion.js';
import { registrarEntradaDeSoporte } from '../bitacora/contexto.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { usarValidadorDeSesion } from '../compartido/http/guardias.js';
import { configuracion } from '../configuracion/contexto.js';
import { AsignadorDeNombreDeUsuario } from './aplicacion/asignador-de-nombre-de-usuario.js';
import { ActualizarUsuario } from './aplicacion/casos-uso/actualizar-usuario.js';
import { CambiarContrasena } from './aplicacion/casos-uso/cambiar-contrasena.js';
import { CambiarEmpresaActiva } from './aplicacion/casos-uso/cambiar-empresa-activa.js';
import { CerrarSesion } from './aplicacion/casos-uso/cerrar-sesion.js';
import { CrearUsuario } from './aplicacion/casos-uso/crear-usuario.js';
import { IniciarSesion } from './aplicacion/casos-uso/iniciar-sesion.js';
import { LimpiarSesionesVencidas } from './aplicacion/casos-uso/limpiar-sesiones-vencidas.js';
import { ListarUsuarios } from './aplicacion/casos-uso/listar-usuarios.js';
import { ObtenerResumenDeSesion } from './aplicacion/casos-uso/obtener-resumen-de-sesion.js';
import { SugerirNombreDeUsuario } from './aplicacion/casos-uso/sugerir-nombre-de-usuario.js';
import { ValidarSesion } from './aplicacion/casos-uso/validar-sesion.js';
import { ResolutorDeAcceso } from './aplicacion/resolutor-de-acceso.js';
import { VigenciaDeSesion } from './dominio/vigencia-de-sesion.js';
import { SesionControlador } from './http/sesion.controlador.js';
import { rutasSesion } from './http/sesion.rutas.js';
import { UsuariosControlador } from './http/usuarios.controlador.js';
import { rutasUsuarios } from './http/usuarios.rutas.js';
import { CatalogoDeModulosEnRegistro } from './infraestructura/catalogo-de-modulos-en-registro.js';
import { cifradorDeContrasenas } from './infraestructura/cifrador-argon2.js';
import { AccesosAEmpresasDrizzle } from './infraestructura/persistencia/accesos-a-empresas.drizzle.js';
import { ConsultasUsuariosDrizzle } from './infraestructura/persistencia/consultas-usuarios.drizzle.js';
import { EmpresasDeLaSesionDrizzle } from './infraestructura/persistencia/empresas-de-la-sesion.drizzle.js';
import { RepositorioSesionesDrizzle } from './infraestructura/persistencia/repositorio-sesiones.drizzle.js';
import { RepositorioUsuariosDrizzle } from './infraestructura/persistencia/repositorio-usuarios.drizzle.js';
import { TokensAleatorios } from './infraestructura/tokens-aleatorios.js';

export { cifradorDeContrasenas };

const sesiones = new RepositorioSesionesDrizzle(bd);

/** Para la semilla, que trabaja fuera de una unidad de trabajo. */
export const usuariosSinTransaccion = new RepositorioUsuariosDrizzle(() => bd);

/** Las piezas de usuarios dentro de una transacción ajena (la del alta de cuentas). */
export function usuariosEn(tx: Ejecutor) {
  const repositorio = new RepositorioUsuariosDrizzle(() => tx);
  return { repositorio, asignador: new AsignadorDeNombreDeUsuario({ usuarios: repositorio }) };
}

/** El servidor la ejecuta cada hora. */
export const limpiarSesionesVencidas = new LimpiarSesionesVencidas({ sesiones });

function controladorDeUsuarios({ unidadDeTrabajo, auditoria }: DependenciasCompartidas): UsuariosControlador {
  const repositorio = new RepositorioUsuariosDrizzle();
  const accesos = new AccesosAEmpresasDrizzle();
  const asignador = new AsignadorDeNombreDeUsuario({ usuarios: repositorio });
  const cifrador = cifradorDeContrasenas;
  return new UsuariosControlador({
    listar: new ListarUsuarios({ consultas: new ConsultasUsuariosDrizzle(bd) }),
    sugerirNombre: new SugerirNombreDeUsuario({ unidadDeTrabajo, asignador }),
    crear: new CrearUsuario({ unidadDeTrabajo, repositorio, accesos, asignador, cifrador }),
    actualizar: new ActualizarUsuario({ unidadDeTrabajo, repositorio, accesos, sesiones, auditoria }),
    cambiarContrasena: new CambiarContrasena({ unidadDeTrabajo, repositorio, cifrador, sesiones }),
  });
}

function piezasDeSesion() {
  const empresas = new EmpresasDeLaSesionDrizzle(bd);
  return {
    tokens: new TokensAleatorios(),
    vigencia: new VigenciaDeSesion(ajustesDelServidor.DURACION_SESION_DIAS),
    empresas,
    resolutor: new ResolutorDeAcceso({ empresas, modulos: new CatalogoDeModulosEnRegistro(), roles: consultasRoles }),
    bitacora: { registrarEntrada: registrarEntradaDeSoporte.ejecutar.bind(registrarEntradaDeSoporte) },
  };
}

/** Arma la sesión y entrega a las guardias el validador de tokens. */
function controladorDeSesion(): SesionControlador {
  const { tokens, vigencia, empresas, resolutor, bitacora } = piezasDeSesion();
  const cambiarEmpresa = new CambiarEmpresaActiva({ sesiones, empresas, resolutor, bitacora });
  const validar = new ValidarSesion({ sesiones, tokens, vigencia, resolutor });
  usarValidadorDeSesion({ validar: (token) => validar.ejecutar(token) });
  return new SesionControlador({
    iniciar: new IniciarSesion({
      usuarios: usuariosSinTransaccion,
      cifrador: cifradorDeContrasenas,
      sesiones,
      tokens,
      vigencia,
    }),
    cerrar: new CerrarSesion({ sesiones, tokens }),
    obtenerResumen: new ObtenerResumenDeSesion({ empresas, configuracion: configuracion.lector, cambiarEmpresa }),
    cambiarEmpresa,
  });
}

/** Raíz de composición del contexto de identidad: usuarios de la cuenta y sesiones. */
export function componerIdentidad(compartidas: DependenciasCompartidas): FastifyPluginAsync {
  const usuarios = rutasUsuarios(controladorDeUsuarios(compartidas));
  const sesion = rutasSesion(controladorDeSesion());
  return async (app) => {
    await app.register(sesion);
    await app.register(usuarios);
  };
}
