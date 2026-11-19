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
const RUTA_CONCEPTOS = '/api/libro-de-compras/conceptos-de-gasto';
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const registrar = (linea: Record<string, unknown>) =>
  propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, { lineas: [{ conceptoId: escenario.conceptoId, total: '1120.00', ...linea }] }),
  );

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'inventario');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
  });
});

afterAll(() => vi.restoreAllMocks());

describe('línea de inventario', () => {
  it('se registra y el documento la devuelve marcada', async () => {
    const respuesta = await registrar({ esInventario: true });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.documento.lineas[0]).toMatchObject({ esInventario: true, esActivoFijo: false });
  });

  it('no puede ser a la vez activo fijo', async () => {
    const respuesta = await registrar({ esActivoFijo: true, esInventario: true });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('linea_con_dos_destinos_del_costo');
  });

  it('un servicio no es inventario', async () => {
    const respuesta = await registrar({ tipo: 'servicio', esInventario: true });

    expect(respuesta.cuerpo.error.codigo).toBe('inventario_no_es_bien');
  });

  it('en el SAT-2237 sigue siendo una compra de bienes', async () => {
    const { cuerpo } = await propietario().get(RUTA_SAT);
    const rubros = cuerpo.rubros as Array<{ clave: string; neto: unknown }>;

    expect(rubros.find((r) => r.clave === 'otras_compras')?.neto).toEqual({ base: '1000.00', iva: '120.00' });
    expect(rubros.find((r) => r.clave === 'activos_fijos')?.neto).toEqual({ base: '0.00', iva: '0.00' });
  });
});

describe('concepto de gasto de inventario', () => {
  const concepto = (cambios: Record<string, unknown>) => ({
    nombre: `Insumos ${Math.random()}`,
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    esInventario: true,
    activo: true,
    ...cambios,
  });

  it('propone la marca a la línea', async () => {
    const creado = await propietario().post(RUTA_CONCEPTOS, concepto({}));
    expect(creado.cuerpo.esInventario).toBe(true);

    const respuesta = await registrar({ conceptoId: creado.cuerpo.id });

    expect(respuesta.cuerpo.documento.lineas[0].esInventario).toBe(true);
  });

  it('no se guarda como activo fijo e inventario, ni como servicio', async () => {
    const dos = await propietario().post(RUTA_CONCEPTOS, concepto({ esActivoFijo: true }));
    const servicio = await propietario().post(RUTA_CONCEPTOS, concepto({ tipoPorOmision: 'servicio' }));

    expect(dos.estado).toBe(400);
    expect(servicio.estado).toBe(400);
  });
});
