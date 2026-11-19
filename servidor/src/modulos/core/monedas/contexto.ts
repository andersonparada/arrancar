import type { FastifyPluginAsync } from 'fastify';
import { bd } from '../base-datos/conexion.js';
import { calendarioLaboral } from '../calendario/contexto.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { TiposDeCambio } from './aplicacion/tipos-de-cambio.js';
import { ConsultarTipoVigente } from './aplicacion/casos-uso/consultar-tipo-vigente.js';
import { EditarMoneda } from './aplicacion/casos-uso/editar-moneda.js';
import { ListarMonedas } from './aplicacion/casos-uso/listar-monedas.js';
import { ListarMonedasDelBanguat } from './aplicacion/casos-uso/listar-monedas-del-banguat.js';
import { ListarSerieDeTipos } from './aplicacion/casos-uso/listar-serie-de-tipos.js';
import { ListarVersionesDeTipo } from './aplicacion/casos-uso/listar-versiones-de-tipo.js';
import { RegistrarTipoDeCambio } from './aplicacion/casos-uso/registrar-tipo-de-cambio.js';
import { CODIGOS_DEL_BANGUAT_EXCLUIDOS } from './dominio/codigos-del-banguat-excluidos.js';
import { MonedasControlador } from './http/monedas.controlador.js';
import { rutasMonedas } from './http/monedas.rutas.js';
import { TiposDeCambioControlador } from './http/tipos-de-cambio.controlador.js';
import { rutasTiposDeCambio } from './http/tipos-de-cambio.rutas.js';
import { MonedasDelBanguatDrizzle } from './infraestructura/persistencia/monedas-del-banguat.drizzle.js';
import { MonedasDrizzle } from './infraestructura/persistencia/monedas.drizzle.js';
import { TiposDeCambioDrizzle } from './infraestructura/persistencia/tipos-de-cambio.drizzle.js';
import { RelojDeLaInstalacion } from './infraestructura/reloj-de-la-instalacion.js';

const catalogo = new MonedasDrizzle(bd);
const delBanguat = new MonedasDelBanguatDrizzle(bd);
const guardados = new TiposDeCambioDrizzle(bd);

/**
 * Qué tipo de cambio rige en una fecha. Es uno solo para todo el servidor (guarda en memoria lo que ya leyó); los
 * módulos lo reciben al armarse, igual que `calendarioLaboral`.
 */
export const tiposDeCambio = new TiposDeCambio({
  guardados,
  calendario: calendarioLaboral,
  reloj: new RelojDeLaInstalacion(),
});

/** Raíz de composición de las monedas: la API del catálogo y de los tipos de cambio. */
export function componerMonedas({ unidadDeTrabajo, auditoria }: DependenciasCompartidas): FastifyPluginAsync {
  const excluidos = CODIGOS_DEL_BANGUAT_EXCLUIDOS;
  const monedas = new MonedasControlador({
    listar: new ListarMonedas({ catalogo }),
    listarDelBanguat: new ListarMonedasDelBanguat({ catalogo, delBanguat, excluidos }),
    editar: new EditarMoneda({ unidadDeTrabajo, catalogo, delBanguat, auditoria, excluidos }),
  });
  const tipos = new TiposDeCambioControlador({
    serie: new ListarSerieDeTipos({ tiposDeCambio }),
    vigente: new ConsultarTipoVigente({ tiposDeCambio }),
    versiones: new ListarVersionesDeTipo({ guardados }),
    registrar: new RegistrarTipoDeCambio({ unidadDeTrabajo, guardados, catalogo, tiposDeCambio }),
  });
  return async (app) => {
    await app.register(rutasMonedas(monedas));
    await app.register(rutasTiposDeCambio(tipos));
  };
}
