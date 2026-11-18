/**
 * El SQL de `ConsultaDeSaldosAlCorte` contra las reglas del dominio (`dominio/saldo-al-corte.ts`): en el escenario con todo
 * (saldos iniciales, un documento del libro anterior a la fecha de inicio, notas, ajustes, pagos hechos, posfechados y
 * anulados, y reintegros) el saldo, lo pagado, lo comprometido y el estado de pago de cada cargo salen iguales por las dos vías, a varios
 * cortes, antes y después de anular.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { aCentavos, deCentavos } from '../modulos/core/compartido/dominio/centavos.js';
import { ESTADOS_DE_PAGO, estadoDePagoDe } from '../modulos/cuentas-por-pagar/dominio/pagos.js';
import {
  fechaDeEfectoDelDocumento,
  fechaDeEfectoDelPago,
  saldoDelCargoAlCorte,
  vigenteAlCorte,
} from '../modulos/cuentas-por-pagar/dominio/saldo-al-corte.js';
import type { OrigenDeDocumento } from '../modulos/cuentas-por-pagar/dominio/tipos-de-documento.js';
import {
  anularDocumentoEnLaBase,
  anularPagoEnLaBase,
  anularReintegroEnLaBase,
} from './soporte/cuentas-por-pagar-reportes.js';
import { anularAjuste } from './soporte/cuentas-por-pagar-notas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
import { prepararMundoDeSaldos, type MundoDeSaldos } from './soporte/escenario-de-reportes-de-saldos.js';

const R2 = '/api/cuentas-por-pagar/reportes/documentos';
const INICIO = '2026-01-01';
const CORTES = ['2025-12-31', '2026-03-31', '2026-10-05', '2026-10-31', HOY];
const entorno = usarEntornoApi();
let m: MundoDeSaldos;

beforeAll(async () => {
  m = await prepararMundoDeSaldos(entorno, 'cxprepdominio');
}, 60_000);

const DIA_DE_GUATEMALA = (columna: string) => `(${columna} at time zone 'America/Guatemala')::date::text`;

interface Datos {
  documentos: Array<{
    id: string;
    numero: string;
    tipo: string;
    origen: OrigenDeDocumento;
    emision: string;
    anulado: string | null;
    neto: string;
  }>;
  aplicaciones: Array<{ cargo_id: string; monto: string; fecha: string }>;
  ajustes: Array<{ documento_id: string; monto: string; fecha: string; anulado: string | null }>;
  pagos: Array<{ cargo_id: string; monto: string; fecha: string; baja: string | null; emitido: string }>;
}

/** Todo lo sembrado de la empresa, tal como está en la base ahora. */
async function leerDatos(): Promise<Datos> {
  const empresa = [m.escenario.cuenta.empresaId];
  return {
    documentos: await consultar(
      `select id, numero, tipo, origen, fecha_emision::text as emision, coalesce(saldo_al_inicio, total - retenciones)::text as neto,
              case when estado = 'anulado' then ${DIA_DE_GUATEMALA('anulado_en')} end as anulado
         from cuentas_por_pagar.documentos where empresa_id = $1`,
      empresa,
    ),
    aplicaciones: await consultar(
      'select cargo_id, monto::text, fecha::text from cuentas_por_pagar.aplicaciones_de_notas where empresa_id = $1',
      empresa,
    ),
    ajustes: await consultar(
      `select documento_id, monto::text, fecha::text,
              case when estado = 'anulado' then ${DIA_DE_GUATEMALA('anulado_en')} end as anulado
         from cuentas_por_pagar.ajustes_de_saldo where empresa_id = $1`,
      empresa,
    ),
    pagos: await consultar(
      `select a.cargo_id, a.monto::text, p.fecha::text, p.fecha_de_anulacion::text as baja,
              ${DIA_DE_GUATEMALA('p.creado_en')} as emitido
         from cuentas_por_pagar.aplicaciones_de_pagos a join cuentas_por_pagar.pagos p on p.id = a.pago_id
        where a.empresa_id = $1`,
      empresa,
    ),
  };
}

const suma = (filas: Array<{ monto: string }>) => filas.reduce((total, { monto }) => total + aCentavos(monto), 0);

/** Las cifras de un cargo que el SQL y el dominio deben dar iguales, con su estado de pago. */
interface CifrasDelReporte {
  saldo: string;
  pagado: string;
  comprometido: string;
  estadoDePago: string;
}

/** Lo que el dominio dice de cada cargo al corte: saldo, pagado y comprometido por número de documento. */
function esperadoAl(corte: string, datos: Datos) {
  const esperado = new Map<string, CifrasDelReporte>();
  for (const documento of datos.documentos.filter(({ tipo }) => tipo !== 'nota_de_credito')) {
    const efecto = fechaDeEfectoDelDocumento({ origen: documento.origen, fechaEmision: documento.emision }, INICIO);
    if (efecto > corte || !vigenteAlCorte(documento.anulado, corte)) continue;
    const lineas = datos.pagos.filter((p) => p.cargo_id === documento.id && vigenteAlCorte(p.baja, corte));
    const hechos = lineas.filter((p) => fechaDeEfectoDelPago(p.fecha, null) <= corte);
    const comprometidos = lineas.filter((p) => fechaDeEfectoDelPago(p.fecha, null) > corte && p.emitido <= corte);
    const saldoCentavos = saldoDelCargoAlCorte({
      netoCentavos: aCentavos(documento.neto),
      aplicadoCentavos: suma(datos.aplicaciones.filter((a) => a.cargo_id === documento.id && a.fecha <= corte)),
      pagadoCentavos: suma(hechos),
      ajustadoCentavos: suma(
        datos.ajustes.filter(
          (a) => a.documento_id === documento.id && a.fecha <= corte && vigenteAlCorte(a.anulado, corte),
        ),
      ),
    });
    esperado.set(documento.numero, {
      saldo: deCentavos(saldoCentavos),
      pagado: deCentavos(suma(hechos)),
      comprometido: deCentavos(suma(comprometidos)),
      estadoDePago: estadoDePagoDe({
        deudaCentavos: saldoCentavos,
        pagadoCentavos: suma(hechos),
        comprometidoCentavos: suma(comprometidos),
      }),
    });
  }
  return esperado;
}

/** Lo que dice el reporte: todos los cargos, también los pagados (un pedido por estado de pago). */
async function delReporte(corte: string) {
  const filas: Array<CifrasDelReporte & { numero: string }> = [];
  for (const estado of ESTADOS_DE_PAGO) {
    const respuesta = await m.soloVer.get(`${R2}?corte=${corte}&estadoDePago=${estado}&limite=500`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    filas.push(...respuesta.cuerpo.filas);
  }
  return new Map(
    filas.map(({ numero, ...cifras }) => [
      numero,
      {
        saldo: cifras.saldo,
        pagado: cifras.pagado,
        comprometido: cifras.comprometido,
        estadoDePago: cifras.estadoDePago,
      },
    ]),
  );
}

async function compararTodosLosCortes() {
  const datos = await leerDatos();
  for (const corte of CORTES) {
    const reporte = await delReporte(corte);
    expect(reporte.size, `cargos al ${corte}`).toBeGreaterThan(0);
    expect(Object.fromEntries(reporte), `al ${corte}`).toEqual(Object.fromEntries(esperadoAl(corte, datos)));
  }
}

describe('el SQL coincide con el dominio', () => {
  it('con todo vigente, a cinco cortes', compararTodosLosCortes);

  it('después de anular un pago, un ajuste, un reintegro y un documento, a los mismos cortes', async () => {
    await anularPagoEnLaBase(m.pagoQueSeAnula);
    await anularAjuste(m.escenario, m.ajusteQueSeAnula);
    await anularReintegroEnLaBase(m.reintegroQueSeAnula);
    await anularDocumentoEnLaBase(m.delLibro);

    await compararTodosLosCortes();
  });
});
