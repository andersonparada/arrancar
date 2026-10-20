import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  nitValido,
  prepararEscenario,
  primerDiaDelMes,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './escenarios.js';
import { VendedoresDePrueba } from './factura-especial.js';

export const RAIZ_DE_ANALISIS = '/api/libro-de-compras/analisis';
export const MES_ANTERIOR = primerDiaDelMes(-1);
export const MES_ACTUAL = primerDiaDelMes(0);
/** El rango de dos meses con que se prueban los análisis. */
export const RANGO = `desde=${MES_ANTERIOR.slice(0, 7)}&hasta=${MES_ACTUAL.slice(0, 7)}`;
export const MES = (primerDia: string): string => primerDia.slice(0, 7);

export interface EscenarioDeAnalisis {
  escenario: EscenarioDeDocumentos;
  otraEmpresa: EscenarioDeDocumentos;
  soloVer: ClienteApi;
  soloDocumentos: ClienteApi;
}

const linea = (escenario: EscenarioDeDocumentos, total: string, extra: Record<string, unknown> = {}) => [
  { conceptoId: escenario.conceptoId, total, ...extra },
];

async function registrar(donde: EscenarioDeDocumentos, cambios: Record<string, unknown> = {}) {
  const respuesta = await donde.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(donde, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
}

async function crear(escenario: EscenarioDeDocumentos, ruta: string, cuerpo: Record<string, unknown>) {
  const respuesta = await escenario.cuenta.propietario.post(`/api/libro-de-compras/${ruta}`, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.id as string;
}

/** Gasolina con IDP desde hace dos meses y Diésel exento por decreto solo desde este mes; devuelve la gasolina. */
async function prepararCombustibles(escenario: EscenarioDeDocumentos): Promise<string> {
  const gasolinaId = await crear(escenario, 'combustibles', { nombre: 'Gasolina', activo: true });
  const base = { porcentajeDeEtanol: '0.00', vigenteHasta: null };
  await crear(escenario, 'vigencias-de-combustible', {
    ...base,
    combustibleId: gasolinaId,
    idpPorGalon: '4.70',
    ivaExento: false,
    vigenteDesde: primerDiaDelMes(-2),
  });
  await crear(escenario, 'vigencias-de-combustible', {
    ...base,
    combustibleId: escenario.combustibleId,
    idpPorGalon: '0.00',
    ivaExento: true,
    vigenteDesde: MES_ACTUAL,
  });
  return gasolinaId;
}

interface Insumos {
  gasolinaId: string;
  honorariosId: string;
  proveedorB: string;
}

/** El mes anterior: un servicio de otro proveedor, gasolina y un activo fijo. */
async function armarElMesAnterior(e: EscenarioDeDocumentos, insumos: Insumos): Promise<void> {
  const enElMes = { fechaEmision: MES_ANTERIOR, fechaRecepcion: MES_ANTERIOR };
  await registrar(e, {
    ...enElMes,
    proveedorId: insumos.proveedorB,
    nitEmisor: nitValido('3000002'),
    lineas: [{ conceptoId: insumos.honorariosId, total: '1120.00' }],
  });
  const gasolina = { combustibleId: insumos.gasolinaId, galones: '10' };
  await registrar(e, { ...enElMes, lineas: linea(e, '1167.00', gasolina) });
  await registrar(e, { ...enElMes, lineas: linea(e, '2240.00', { esActivoFijo: true }) });
}

/** Este mes: factura, una fuera de plazo, activo fijo, nota de crédito, gasolina, diésel exento y una factura especial. */
async function armarElMesActual(e: EscenarioDeDocumentos, insumos: Insumos): Promise<void> {
  const facturaId = await registrar(e);
  await registrar(e, { fechaEmision: haceDias(100) });
  await registrar(e, { lineas: linea(e, '1120.00', { esActivoFijo: true, descripcion: 'Báscula ganadera' }) });
  await registrar(e, { tipoDte: 'NCRE', serie: 'N', documentoAfectadoId: facturaId, lineas: linea(e, '560.00') });
  const gasolina = { combustibleId: insumos.gasolinaId, galones: '10' };
  await registrar(e, { lineas: linea(e, '1167.00', gasolina) });
  await registrar(e, { lineas: linea(e, '500.00', { combustibleId: e.combustibleId, galones: '10' }) });
  const vendedores = new VendedoresDePrueba(e);
  const vendedor = await vendedores.nuevo();
  const fesp = vendedores.cuerpo(vendedor.proveedorId, { nitReceptor: nitValido('4100001'), fechaEmision: HOY });
  expect((await e.cuenta.propietario.post(RUTA_DOCUMENTOS, fesp)).estado).toBe(201);
}

/**
 * Una empresa general con agente de retención de ISR y dos meses de compras (de ocho documentos de un proveedor,
 * uno de otro y una factura especial), más otra empresa con una factura y dos usuarios con permisos sueltos.
 */
export async function armarEscenarioDeAnalisis(entorno: EntornoApi, usuario: string): Promise<EscenarioDeAnalisis> {
  const escenario = await prepararEscenario(entorno, usuario);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: true,
  });
  const insumos = {
    gasolinaId: await prepararCombustibles(escenario),
    honorariosId: await crear(escenario, 'conceptos-de-gasto', {
      nombre: 'Honorarios',
      tipoPorOmision: 'servicio',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: true,
    }),
    proveedorB: (await registrarProveedor(escenario.cuenta, 'Servicios Veterinarios')).proveedorId,
  };
  await armarElMesAnterior(escenario, insumos);
  await armarElMesActual(escenario, insumos);
  const otraEmpresa = await prepararEscenario(entorno, `${usuario}ajena`);
  await registrar(otraEmpresa);
  const permisos = (nombres: string, permiso: string) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Analisis', permisos: [permiso] });
  return {
    escenario,
    otraEmpresa,
    soloVer: await permisos('Solo ver', 'libro-de-compras.analisis-de-compras.ver'),
    soloDocumentos: await permisos('Solo documentos', 'libro-de-compras.documentos.ver'),
  };
}
