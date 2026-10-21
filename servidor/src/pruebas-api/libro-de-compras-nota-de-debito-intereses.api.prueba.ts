import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { MES, MES_ACTUAL, RAIZ_DE_ANALISIS } from './soporte/escenario-de-analisis.js';

const entorno = usarEntornoApi();
const RANGO_DEL_MES = `desde=${MES(MES_ACTUAL)}&hasta=${MES(MES_ACTUAL)}`;
let escenario: EscenarioDeDocumentos;
let conceptoDeIntereses: string;
let facturaId: string;

const propietario = () => escenario.cuenta.propietario;

async function registrar(cambios: Record<string, unknown>) {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
}

const nota = (clase: string | null, total: string, conceptoId = escenario.conceptoId) =>
  registrar({
    tipoDte: 'NDEB',
    serie: 'D',
    documentoAfectadoId: facturaId,
    claseDeCargo: clase,
    lineas: [{ conceptoId, total }],
  });

async function analisis(ruta: string) {
  const respuesta = await propietario().get(`${RAIZ_DE_ANALISIS}/${ruta}?${RANGO_DEL_MES}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'interesesdenota');
  await configurarEmpresa(escenario.cuenta, { regimenIva: 'general', regimenIsr: 'utilidades' });
  const concepto = await propietario().post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Intereses y recargos a proveedores',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  });
  expect(concepto.estado, JSON.stringify(concepto.cuerpo)).toBe(201);
  conceptoDeIntereses = concepto.cuerpo.id;
  facturaId = await registrar({ lineas: [{ conceptoId: escenario.conceptoId, total: '1120.00' }] });
});

afterAll(() => vi.restoreAllMocks());

describe('clase de cargo de la nota de débito (U15)', () => {
  it('se guarda solo en la nota de débito', async () => {
    const intereses = await nota('intereses', '56.00', conceptoDeIntereses);
    const sinClase = await nota(null, '56.00');
    const filas = await consultar<{ id: string; clase_de_cargo: string | null }>(
      'select id, clase_de_cargo from libro_de_compras.documentos where id = any($1)',
      [[intereses, sinClase, facturaId]],
    );

    const claseDe = (id: string) => filas.find((fila) => fila.id === id)?.clase_de_cargo;
    expect(claseDe(intereses)).toBe('intereses');
    expect(claseDe(sinClase)).toBeNull();
    expect(claseDe(facturaId)).toBeNull();
  });

  it('la base no admite una clase de cargo fuera de la nota de débito ni una clase desconocida', async () => {
    await expect(
      consultar(`update libro_de_compras.documentos set clase_de_cargo = 'intereses' where id = $1`, [facturaId]),
    ).rejects.toThrow(/documentos_clase_de_cargo_valida/);
  });

  it('los análisis por proveedor y por concepto no suman los intereses; los otros cargos sí', async () => {
    const antes = await analisis('compras-por-proveedor');
    const conceptosAntes = await analisis('compras-por-concepto');
    await nota('intereses', '112.00', conceptoDeIntereses);
    await nota('otros', '224.00');
    const despues = await analisis('compras-por-proveedor');
    const conceptosDespues = await analisis('compras-por-concepto');

    expect(Number(despues.total.total) - Number(antes.total.total)).toBe(224);
    expect(despues.total.documentos - antes.total.documentos).toBe(1);
    const nombres = (cuerpo: { filas: { concepto: string }[] }) => cuerpo.filas.map((fila) => fila.concepto);
    expect(nombres(conceptosDespues)).not.toContain('Intereses y recargos a proveedores');
    expect(conceptosDespues.total.lineas - conceptosAntes.total.lineas).toBe(1);
  });
});
