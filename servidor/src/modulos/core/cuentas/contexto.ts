import { insertarRol } from '../autorizacion/infraestructura/persistencia/escritura-de-roles.js';
import { bd, type Transaccion } from '../base-datos/conexion.js';
import { cifradorDeContrasenas, usuariosEn, usuariosSinTransaccion } from '../identidad/contexto.js';
import { ActivarModulo } from './aplicacion/casos-uso/activar-modulo.js';
import { CambiarCuenta } from './aplicacion/casos-uso/cambiar-cuenta.js';
import { DarDeAltaCuenta } from './aplicacion/casos-uso/dar-de-alta-cuenta.js';
import { DesactivarModulo } from './aplicacion/casos-uso/desactivar-modulo.js';
import { ListarCuentas } from './aplicacion/casos-uso/listar-cuentas.js';
import { ListarModulos } from './aplicacion/casos-uso/listar-modulos.js';
import type { PiezasDeAlta } from './aplicacion/puertos/transaccion-de-alta.js';
import { CuentasControlador } from './http/cuentas.controlador.js';
import { rutasCuentas } from './http/cuentas.rutas.js';
import { CatalogoDeModulosEnRegistro } from './infraestructura/catalogo-de-modulos-en-registro.js';
import { ConsultasCuentasDrizzle } from './infraestructura/persistencia/consultas-cuentas.drizzle.js';
import { EmpresaInicialDrizzle } from './infraestructura/persistencia/empresa-inicial.drizzle.js';
import { RepositorioCuentasDrizzle } from './infraestructura/persistencia/repositorio-cuentas.drizzle.js';
import { TransaccionDeAltaPostgres } from './infraestructura/persistencia/transaccion-de-alta-postgres.js';

const catalogo = new CatalogoDeModulosEnRegistro();

/** Cuentas, autorización e identidad escriben en la misma transacción del alta. */
function piezasDeAltaEn(tx: Transaccion): PiezasDeAlta {
  const usuarios = usuariosEn(tx);
  return {
    cuentas: new RepositorioCuentasDrizzle(() => tx),
    empresa: new EmpresaInicialDrizzle(tx),
    roles: { agregar: (rol) => insertarRol(tx, rol) },
    usuarios: usuarios.repositorio,
    asignador: usuarios.asignador,
  };
}

/** También la usa la semilla para crear la cuenta de demostración. */
export const darDeAltaCuenta = new DarDeAltaCuenta({
  catalogo,
  usuariosExistentes: usuariosSinTransaccion,
  cifrador: cifradorDeContrasenas,
  transaccion: new TransaccionDeAltaPostgres(bd, piezasDeAltaEn),
});

/** Raíz de composición del contexto de cuentas (panel de plataforma de soporte). */
export function componerCuentas() {
  const repositorio = new RepositorioCuentasDrizzle(() => bd);
  const listarModulos = new ListarModulos({ repositorio, catalogo });
  const controlador = new CuentasControlador({
    listar: new ListarCuentas({ consultas: new ConsultasCuentasDrizzle(bd) }),
    darDeAlta: darDeAltaCuenta,
    cambiar: new CambiarCuenta({ repositorio }),
    listarModulos,
    activarModulo: new ActivarModulo({ repositorio, catalogo, listarModulos }),
    desactivarModulo: new DesactivarModulo({ repositorio, catalogo, listarModulos }),
  });
  return rutasCuentas(controlador);
}
