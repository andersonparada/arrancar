import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  HOY,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const PERIODO = HOY.slice(0, 7);
const RUTA_SAT = `/api/libro-de-compras/libro/sat-2237?periodo=${PERIODO}`;
const RUTA_ANALISIS = `/api/libro-de-compras/analisis/activos-fijos?desde=${PERIODO}&hasta=${PERIODO}`;
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const lineas = (total: string, extra: Record<string, unknown>) => [
  { conceptoId: escenario.conceptoId, total, ...extra },
];

async function registrar(cambios: Record<string, unknown>) {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'afservicio');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
  });
  await registrar({ lineas: lineas('1120.00', { tipo: 'servicio', esActivoFijo: true, descripcion: 'Instalación' }) });
  await registrar({ lineas: lineas('2240.00', { esActivoFijo: true, descripcion: 'Tractor' }) });
});

afterAll(() => vi.restoreAllMocks());

const rubroDe = (cuerpo: { rubros: Array<{ clave: string; neto: unknown }> }, clave: string) =>
  cuerpo.rubros.find((rubro) => rubro.clave === clave)?.neto;

describe('un servicio capitalizado como activo fijo', () => {
  it('se acepta y conserva su tipo de servicio', async () => {
    const respuesta = await propietario().get(RUTA_ANALISIS);

    expect(respuesta.cuerpo.filas.map((f: { tipoDeLinea: string }) => f.tipoDeLinea)).toEqual(['servicio', 'bien']);
  });

  it('en el SAT-2237 queda en servicios y solo el bien en activos fijos', async () => {
    const { cuerpo } = await propietario().get(RUTA_SAT);

    expect(rubroDe(cuerpo, 'servicios')).toEqual({ base: '1000.00', iva: '120.00' });
    expect(rubroDe(cuerpo, 'activos_fijos')).toEqual({ base: '2000.00', iva: '240.00' });
  });

  it('el análisis de activos fijos los trae todos, con el costo de cada uno', async () => {
    const { cuerpo } = await propietario().get(RUTA_ANALISIS);

    expect(cuerpo.filas.map((f: { costo: string }) => f.costo)).toEqual(['1000.00', '2000.00']);
    expect(cuerpo.total).toEqual({ costo: '3000.00', ivaConCredito: '360.00' });
  });
});
