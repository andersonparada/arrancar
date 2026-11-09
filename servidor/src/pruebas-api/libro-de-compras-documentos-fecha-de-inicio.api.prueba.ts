import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { operadorDeLaBandeja, RUTA_DTE, sembrarFila, sembrarLote } from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const FECHA_DE_INICIO = haceDias(10);
const ANTERIOR = haceDias(40);
const PARTE_DEL_AVISO = 'es de antes de la fecha de inicio';
const NIT_DE_LA_BANDEJA = nitValido('4800001');

let conFecha: EscenarioDeDocumentos;
let sinFecha: EscenarioDeDocumentos;

const avisosDe = (cuerpo: { avisos?: string[] }) => cuerpo.avisos ?? [];
const conAviso = (avisos: string[]) => avisos.filter((aviso) => aviso.includes(PARTE_DEL_AVISO));

async function empresaConFiscal(clave: string, fechaDeInicio: string | null): Promise<EscenarioDeDocumentos> {
  const escenario = await prepararEscenario(entorno, clave);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  if (fechaDeInicio) {
    const guardada = await escenario.cuenta.propietario.put(
      `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`,
      {
        fechaDeInicio,
      },
    );
    expect(guardada.estado, JSON.stringify(guardada.cuerpo)).toBe(200);
  }
  return escenario;
}

beforeAll(async () => {
  instalarDestinoFalso();
  conFecha = await empresaConFiscal('fechainicioconf', FECHA_DE_INICIO);
  sinFecha = await empresaConFiscal('fechainiciosin', null);
});

afterAll(() => vi.restoreAllMocks());

describe('aviso de emisión anterior a la fecha de inicio', () => {
  it('al calcular y al registrar avisa y guarda igual', async () => {
    const cuerpo = documentoDePrueba(conFecha, { fechaEmision: ANTERIOR });
    const calculo = await conFecha.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, cuerpo);
    const registro = await conFecha.cuenta.propietario.post(RUTA_DOCUMENTOS, cuerpo);

    expect(conAviso(avisosDe(calculo.cuerpo))).toHaveLength(1);
    expect(registro.estado, JSON.stringify(registro.cuerpo)).toBe(201);
    const avisos = conAviso(avisosDe(registro.cuerpo));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain(FECHA_DE_INICIO.split('-').reverse().join('/'));
  });

  it('con emisión igual o posterior a la fecha de inicio no avisa', async () => {
    for (const fechaEmision of [FECHA_DE_INICIO, haceDias(1)]) {
      const registro = await conFecha.cuenta.propietario.post(
        RUTA_DOCUMENTOS,
        documentoDePrueba(conFecha, { fechaEmision }),
      );
      expect(registro.estado, JSON.stringify(registro.cuerpo)).toBe(201);
      expect(conAviso(avisosDe(registro.cuerpo))).toEqual([]);
    }
  });

  it('sin fecha de inicio no avisa aunque la emisión sea antigua', async () => {
    const registro = await sinFecha.cuenta.propietario.post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(sinFecha, { fechaEmision: haceDias(400) }),
    );
    expect(registro.estado, JSON.stringify(registro.cuerpo)).toBe(201);
    expect(conAviso(avisosDe(registro.cuerpo))).toEqual([]);
  });

  it('al confirmar desde la bandeja de la SAT también avisa y registra', async () => {
    const operador: Operador = await operadorDeLaBandeja(conFecha);
    const loteId = await sembrarLote(operador);
    await registrarProveedor(conFecha.cuenta, 'Proveedor de la bandeja', { nit: NIT_DE_LA_BANDEJA });
    const id = await sembrarFila(operador, loteId, {
      nitEmisor: NIT_DE_LA_BANDEJA,
      conceptoId: conFecha.conceptoId,
      destino: 'cuentas-por-pagar',
      fechaEmision: ANTERIOR,
      fechaRecepcion: haceDias(1),
    });

    const respuesta = await conFecha.cuenta.propietario.post(`${RUTA_DTE}/confirmar`, { ids: [id] });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const resultado = respuesta.cuerpo.resultados[0];
    expect(resultado.documentoId, JSON.stringify(resultado)).toBeTruthy();
    expect(conAviso(resultado.avisos)).toHaveLength(1);
  });
});
