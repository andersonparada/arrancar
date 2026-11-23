/**
 * QA de Caja chica en el navegador (CC-11): lo que la QA encontró y lo que no tenía prueba.
 * - Los casos con `it.fails` son errores abiertos (informe `informe-qa-caja-chica-2026-11-23.md`): al corregirlos, la
 *   prueba pasa y hay que quitarle el `.fails`.
 * - La bancarización entre un cheque de Cuentas por pagar y una factura de Caja chica al mismo proveedor no tenía prueba.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import { comprobanteEnBase, EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA } from './soporte/caja-chica-comprobantes.js';
import { AyudasDeVales, valeEnBase } from './soporte/caja-chica-vales-provisionales.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { documentoDePrueba, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();

describe('comprobantes de un vale provisional ya liquidado', () => {
  let e: EscenarioDeComprobantes;
  let v: AyudasDeVales;

  beforeAll(async () => {
    e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicaqavales');
    v = new AyudasDeVales(e);
  });

  /** Un vale de Q500.00 liquidado con una factura de Q300.00 y un gasto sin factura de Q50.00 (devuelve Q150.00). */
  async function valeLiquidado(nombre: string) {
    const fondo = await v.fondoDe(nombre);
    const vale = await v.entregarBien(fondo.id);
    const { documentoId } = await e.registrarEnElLibro({ total: '300.00' });
    const documento = await e.enLaBandeja(documentoId);
    const liquidado = await v.liquidar(vale.id, {
      documentos: [{ comprobanteId: documento.id }],
      valesDeGasto: [v.gasto()],
    });
    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);
    const gasto = liquidado.cuerpo.comprobantes.find((c: any) => c.clase === 'vale_de_gasto');
    return { fondo, vale, documentoId, gasto };
  }

  it('anular el gasto sin factura de un vale liquidado se rechaza, como devolver su factura a la bandeja', async () => {
    const { fondo, vale, gasto } = await valeLiquidado('Caja del vale liquidado con gasto anulado');

    const respuesta = await e
      .propietario()
      .post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${gasto.id}/anular`, { motivo: 'Prueba de QA' });

    // Antes respondía 200 y el efectivo esperado subía Q50.00 (2700.00).
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(await valeEnBase(vale.id)).toMatchObject({ estado: 'liquidado', devuelto: '150.00' });
    expect(await v.ficha(fondo.id)).toMatchObject({ efectivoEsperado: '2650.00', pendienteDeReponer: '350.00' });
  });

  it('anular en el libro la factura de un vale liquidado se rechaza y no toca el vale', async () => {
    const { fondo, documentoId } = await valeLiquidado('Caja del vale liquidado con factura anulada en el libro');

    const respuesta = await e.propietario().post(`/api/libro-de-compras/documentos/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Prueba de QA',
    });

    // Antes respondía 200 y el comprobante del vale quedaba anulado: el vale ya no cuadraba.
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(await v.ficha(fondo.id)).toMatchObject({ efectivoEsperado: '2650.00', pendienteDeReponer: '350.00' });
  });
});

describe('arqueo: el acta nombra a quien lo hizo (error abierto)', () => {
  it.fails('arqueadoPor es el nombre de la persona, no su identificador', async () => {
    const e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicaqaarqueo');
    const fondo = await e.abrirFondo('Caja del acta', { monto: '1000.00' });

    const respuesta = await e.propietario().post(`${RUTA_DE_CAJA_CHICA}/fondos/${fondo.id}/arqueos`, {
      conteo: [{ denominacionCentavos: 10000, cantidad: 10 }],
      comprobantesCompletos: true,
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    // Hoy trae el uuid del usuario, y la hoja impresa del acta lo imprime tal cual en «Arqueó:».
    expect(respuesta.cuerpo.arqueadoPor).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(respuesta.cuerpo.arqueadoPor).toMatch(/Dueño/);
  });
});

describe('bancarización entre Caja chica y Cuentas por pagar', () => {
  it('un cheque de Cuentas por pagar y una factura de caja chica al mismo proveedor se suman: llega al umbral, avisa y marca sin bancarizar', async () => {
    const pagos = await EscenarioDePagos.preparar(entorno, 'cajachicaqabanc');
    const cuenta = pagos.mundo.escenario.cuenta;
    const activado = await entorno.soporte.put(`/api/plataforma/cuentas/${cuenta.cuentaId}/modulos/caja-chica`, {});
    expect(activado.estado, JSON.stringify(activado.cuerpo)).toBe(200);
    const propietario = pagos.propietario();

    // Cuentas por pagar: Q29,000.00 con retención de IVA, pagado con cheque (a esta cuenta le salen Q28,533.93).
    const { proveedor, cargo } = await pagos.proveedorConCargo('29000.00');
    const cargoPorPagar = (await propietario.get(`/api/cuentas-por-pagar/documentos/${cargo}`)).cuerpo;
    expect(cargoPorPagar).toMatchObject({ total: '29000.00', retenciones: '466.07', neto: '28533.93' });
    const pagado = await pagos.pagar(pagos.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '28533.93' }]));
    expect(pagado.estado, JSON.stringify(pagado.cuerpo)).toBe(201);

    // Caja chica: un fondo con cheque y una factura de Q1,500.00 del mismo proveedor, registrada desde su ficha.
    const fondo = await propietario.post(RUTA_DE_FONDOS, {
      forma: 'cheque',
      chequeraId: pagos.chequeraId,
      nombre: 'Caja de la bancarización compartida',
      monto: '3000.00',
      custodio: 'Juan Pérez',
      topePorComprobante: '3000.00',
    });
    expect(fondo.estado, JSON.stringify(fondo.cuerpo)).toBe(201);
    const factura = documentoDePrueba(pagos.mundo.escenario, {
      destino: 'caja-chica',
      proveedorId: proveedor.proveedorId,
      nitEmisor: proveedor.nitEmisor,
      lineas: [{ conceptoId: pagos.mundo.escenario.conceptoId, total: '1500.00' }],
      referenciaDeDestino: fondo.cuerpo.id,
    });
    const registrada = await propietario.post(RUTA_DOCUMENTOS, factura);

    expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(201);
    // 28,533.93 del cheque + 1,500.00 de la factura de caja chica: 30,033.93, sobre los Q30,000.00 del umbral.
    expect(registrada.cuerpo.avisos).toHaveLength(1);
    expect(registrada.cuerpo.avisos[0]).toMatch(/^Bancarización .* llega a Q\s?30,033\.93/);
    const comprobantes = (await propietario.get(`${RUTA_DE_FONDOS}/${fondo.cuerpo.id}/comprobantes?estado=pendiente`))
      .cuerpo;
    expect(comprobantes.elementos).toHaveLength(1);
    expect(comprobantes.elementos[0]).toMatchObject({ monto: '1500.00', sinBancarizar: true });
    expect((await comprobanteEnBase(comprobantes.elementos[0].id)).sin_bancarizar).toBe(true);
  });
});
