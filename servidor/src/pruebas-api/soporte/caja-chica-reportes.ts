import { expect } from 'vitest';
import { arquear, ducientos } from './caja-chica-arqueos.js';
import { EscenarioDeComprobantes } from './caja-chica-comprobantes.js';
import { sembrarVale } from './caja-chica-fondos.js';
import { anularReposicion, reponerBien } from './caja-chica-reposiciones.js';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import type { EntornoApi } from './entorno-api.js';
import { haceDias } from './escenario-de-documentos.js';

export const RUTA_DE_REPORTES = '/api/caja-chica/reportes';

/** Pide un reporte y comprueba que responde 200. */
export async function verReporte(cliente: ClienteApi, ruta: string) {
  const respuesta = await cliente.get(`${RUTA_DE_REPORTES}/${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
}

/** Registra un documento del libro con destino al fondo y devuelve el id de su comprobante. */
async function documentoEnElFondo(e: EscenarioDeComprobantes, fondoId: string, cambios: Record<string, unknown> = {}) {
  const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondoId, ...cambios });
  const comprobante = (await e.delFondo(fondoId)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);
  expect(comprobante, 'el documento debía quedar en el fondo').toBeDefined();
  return comprobante.id as string;
}

/**
 * Prepara una cuenta con dos fondos.  El A (Q6,000): una factura pendiente (Q1,120), otra repuesta (Q1,120), un vale de gasto (Q50), un recibo FEL
 * fuera del libro (Q1,120), un arqueo con faltante y una tercera factura repuesta con una reposición ya anulada
 * (movida cinco días atrás, con su reposición tres días atrás). El B (Q2,000): un vale de gasto y un vale provisional de Q200.
 */
export async function prepararEscenarioDeReportes(entorno: EntornoApi, usuario: string) {
  const e = await EscenarioDeComprobantes.preparar(entorno, usuario);
  const fondoA = await e.abrirFondo('Caja de reportes A', { monto: '6000.00' });
  const fondoB = await e.abrirFondo('Caja de reportes B', { monto: '2000.00' });
  await documentoEnElFondo(e, fondoA.id);
  const repuesta = await documentoEnElFondo(e, fondoA.id);
  await reponerBien(e, { fondoId: fondoA.id, ids: [repuesta] });
  expect((await e.registrarVale(fondoA.id)).estado).toBe(201);
  await documentoEnElFondo(e, fondoA.id, {
    tipo: 'recibo',
    tipoDte: 'RECI',
    motivoFueraDelLibro: 'recibo_fel',
    nitEmisor: null,
    serie: null,
    datosFiscalesDelProveedor: null,
  });
  expect((await e.registrarVale(fondoB.id)).estado).toBe(201);
  await sembrarVale(fondoB.id, e.caja.cuenta.empresaId, '200.00');
  const tercera = await documentoEnElFondo(e, fondoA.id);
  const reposicion = await reponerBien(e, { fondoId: fondoA.id, ids: [tercera] });
  expect((await anularReposicion(reposicion.id, e.propietario())).estado).toBe(200);
  await comoPropietario('update caja_chica.comprobantes set fecha = $2 where id = $1', [tercera, haceDias(5)]);
  await comoPropietario('update caja_chica.reposiciones set fecha = $2 where id = $1', [reposicion.id, haceDias(3)]);
  const propuesta = (await e.propietario().get(`/api/caja-chica/fondos/${fondoA.id}/arqueos/propuesta`)).cuerpo;
  const esperado = Number(propuesta.efectivoEsperado);
  const conteo = ducientos(Math.floor(esperado / 200));
  expect(
    (
      await arquear(fondoA.id, e.propietario(), {
        conteo,
        motivoDeDiferencia: 'Cambio mal dado',
        destinoDelFaltante: 'perdida',
      })
    ).estado,
  ).toBe(201);
  return { e, fondoA, fondoB, anulado: { comprobanteId: tercera, reposicionId: reposicion.id } };
}
