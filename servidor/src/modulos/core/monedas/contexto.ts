import type { FastifyPluginAsync } from 'fastify';
import { configuracion as entorno, esProduccion } from '../../../configuracion.js';
import { bd, grupoConexiones } from '../base-datos/conexion.js';
import { calendarioLaboral } from '../calendario/contexto.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { TiposDeCambio } from './aplicacion/tipos-de-cambio.js';
import { ActualizarMonedasDelBanguat } from './aplicacion/casos-uso/actualizar-monedas-del-banguat.js';
import { CargarTiposDeCambio } from './aplicacion/casos-uso/cargar-tipos-de-cambio.js';
import { ConsultarAlBanguat } from './aplicacion/casos-uso/consultar-al-banguat.js';
import { VueltasDeCarga } from './aplicacion/casos-uso/vueltas-de-carga.js';
import { FuenteConReintentos } from './aplicacion/fuente-con-reintentos.js';
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
import { ClienteBanguat } from './infraestructura/banguat/cliente-banguat.js';
import { CargasDeTiposDrizzle } from './infraestructura/persistencia/cargas-de-tipos.drizzle.js';
import { CerrojoDeCargaPostgres } from './infraestructura/persistencia/cerrojo-de-carga.drizzle.js';
import { MonedasDelBanguatDrizzle } from './infraestructura/persistencia/monedas-del-banguat.drizzle.js';
import { MonedasDrizzle } from './infraestructura/persistencia/monedas.drizzle.js';
import { TiposDeCambioDrizzle } from './infraestructura/persistencia/tipos-de-cambio.drizzle.js';
import { RelojDeLaInstalacion } from './infraestructura/reloj-de-la-instalacion.js';

const catalogo = new MonedasDrizzle(bd);
const delBanguat = new MonedasDelBanguatDrizzle(bd);
const guardados = new TiposDeCambioDrizzle(bd);
const reloj = new RelojDeLaInstalacion();

/**
 * Qué tipo de cambio rige en una fecha. Es uno solo para todo el servidor (guarda en memoria lo que ya leyó); los
 * módulos lo reciben al armarse, igual que `calendarioLaboral`.
 */
export const tiposDeCambio = new TiposDeCambio({
  guardados,
  calendario: calendarioLaboral,
  reloj,
});

const cargas = new CargasDeTiposDrizzle(bd);
const cerrojo = new CerrojoDeCargaPostgres(grupoConexiones);
const clienteBanguat = new ClienteBanguat({
  ...(entorno.URL_TIPO_DE_CAMBIO_BANGUAT && { url: entorno.URL_TIPO_DE_CAMBIO_BANGUAT }),
  permitirHttpSinCifrar: !esProduccion,
});
const fuentes = { dolar: new FuenteConReintentos(clienteBanguat), demas: clienteBanguat };
const listaDelBanguat = new ActualizarMonedasDelBanguat({
  fuente: new FuenteConReintentos(clienteBanguat),
  cargas,
  cerrojo,
  ahora: () => reloj.ahora(),
});

/** Si la carga automática está encendida: `CARGAR_TIPOS_DE_CAMBIO`, o sí en producción y no en las demás. */
export const cargaAutomaticaEncendida = entorno.CARGAR_TIPOS_DE_CAMBIO ?? esProduccion;

/** El catálogo de monedas para los módulos que lo leen (Multimoneda): el mismo caso de uso de la API. */
export const listarMonedas = new ListarMonedas({ catalogo });

const alFallar = (mensaje: string, error: unknown) =>
  process.stderr.write(
    `${JSON.stringify({ nivel: 'error', msg: mensaje, detalle: error instanceof Error ? error.message : String(error) })}\n`,
  );

/**
 * La carga de tipos de cambio del Banguat (vueltas, relleno y «Cargar ahora»). La programa `principal.ts`; es una sola
 * para todo el servidor y, al guardar, hace que `tiposDeCambio` olvide lo que tenía leído.
 */
export const cargaDeTiposDeCambio = new CargarTiposDeCambio({
  cerrojo,
  cargas,
  vueltas: new VueltasDeCarga({
    consultar: new ConsultarAlBanguat({ fuentes, cargas, ahora: () => reloj.ahora() }),
    cargas,
    calendario: calendarioLaboral,
    alFallar,
  }),
  lista: listaDelBanguat,
  reloj,
  alGuardar: () => tiposDeCambio.invalidar(),
});

/** Raíz de composición de las monedas: la API del catálogo y de los tipos de cambio. */
export function componerMonedas({ unidadDeTrabajo, auditoria }: DependenciasCompartidas): FastifyPluginAsync {
  const excluidos = CODIGOS_DEL_BANGUAT_EXCLUIDOS;
  const monedas = new MonedasControlador({
    listar: listarMonedas,
    listarDelBanguat: new ListarMonedasDelBanguat({ catalogo, delBanguat, excluidos }),
    editar: new EditarMoneda({ unidadDeTrabajo, catalogo, delBanguat, auditoria, excluidos }),
    actualizarLista: listaDelBanguat,
  });
  const tipos = new TiposDeCambioControlador({
    serie: new ListarSerieDeTipos({ tiposDeCambio }),
    vigente: new ConsultarTipoVigente({ tiposDeCambio }),
    versiones: new ListarVersionesDeTipo({ guardados }),
    registrar: new RegistrarTipoDeCambio({ unidadDeTrabajo, guardados, catalogo, tiposDeCambio }),
    cargar: cargaDeTiposDeCambio,
  });
  return async (app) => {
    await app.register(rutasMonedas(monedas));
    await app.register(rutasTiposDeCambio(tipos));
  };
}
