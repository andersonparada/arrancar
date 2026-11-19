import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FONDO_ID } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { AnularVale } from './anular-vale.js';
import {
  armarEscenarioDeVales,
  AyudasDeVales,
  HOY,
  SIN_EXCEPCIONES,
  type EscenarioDeVales,
} from './dobles-de-vales.soporte.js';
import type { PeticionDeLiquidarVale } from './liquidar-vale.js';

const operador = operadorDePrueba();
let m: EscenarioDeVales;
let ayudas: AyudasDeVales;

const efectivo: AyudasDeVales['efectivo'] = () => ayudas.efectivo();
const entregar: AyudasDeVales['entregar'] = (cambios) => ayudas.entregar(cambios);
const liquidar: AyudasDeVales['liquidar'] = (valeId, cambios) => ayudas.liquidar(valeId, cambios);
const gasto: AyudasDeVales['gasto'] = (cambios) => ayudas.gasto(cambios);
const enLaBandeja: AyudasDeVales['enLaBandeja'] = (total, cambios) => ayudas.enLaBandeja(total, cambios);

beforeEach(async () => {
  m = await armarEscenarioDeVales(1_000_000);
  ayudas = new AyudasDeVales(m);
});

describe('EntregarVale', () => {
  it('entrega el vale abierto con su número y el efectivo de la caja baja por lo entregado', async () => {
    const dto = await entregar();

    expect(dto).toMatchObject({
      numero: 1,
      estado: 'abierto',
      monto: '500.00',
      entregadoA: 'Pedro Compras',
      motivo: 'Compra de repuestos',
      devuelto: '0.00',
      gastado: '0.00',
      comprobantes: [],
    });
    expect(await efectivo()).toBe(950_000);
    expect(m.auditoria.entradas).toEqual([]);
  });

  it('toma el nombre del usuario escogido y rechaza uno que no entra a la empresa', async () => {
    expect(await entregar({ entregadoA: null, entregadoAUsuarioId: 'usuario-1' })).toMatchObject({
      entregadoA: 'Ana Pérez',
      entregadoAUsuarioId: 'usuario-1',
    });
    await expect(entregar({ entregadoAUsuarioId: 'otro' })).rejects.toMatchObject({
      codigo: 'receptor_del_vale_invalido',
    });
  });

  it('exige a quién se entrega, un monto positivo que alcance y una fecha válida', async () => {
    await expect(entregar({ entregadoA: '  ' })).rejects.toMatchObject({ codigo: 'receptor_del_vale_obligatorio' });
    await expect(entregar({ monto: '0.00' })).rejects.toMatchObject({ codigo: 'monto_del_comprobante_invalido' });
    await expect(entregar({ monto: '10000.01' })).rejects.toMatchObject({ codigo: 'vale_mayor_que_el_efectivo' });
    await expect(entregar({ fecha: '2026-11-19' })).rejects.toMatchObject({ codigo: 'fecha_del_vale_invalida' });
    await expect(entregar({ fecha: '2026-10-31' })).rejects.toMatchObject({ codigo: 'fecha_del_vale_invalida' });
  });

  it('los vales siguientes no pasan de lo que queda en la caja', async () => {
    await entregar({ monto: '9000.00' });

    await expect(entregar({ monto: '1000.01' })).rejects.toMatchObject({ codigo: 'vale_mayor_que_el_efectivo' });
    expect(await entregar({ monto: '1000.00' })).toMatchObject({ numero: 2 });
  });
});

describe('LiquidarVale', () => {
  it('asigna documentos y vales de gasto, devuelve lo que sobró y la caja cuadra', async () => {
    const vale = await entregar();
    const documentoId = await enLaBandeja(30_000);

    const dto = await liquidar(vale.id, {
      documentos: [{ comprobanteId: documentoId }],
      valesDeGasto: [gasto()],
    });

    expect(dto).toMatchObject({ estado: 'liquidado', devuelto: '150.00', gastado: '350.00', fechaDeLiquidacion: HOY });
    expect(dto.comprobantes).toHaveLength(2);
    expect(dto.comprobantes.every((c) => c.valeProvisionalId === vale.id && c.fondoId === FONDO_ID)).toBe(true);
    // Antes del vale había Q10,000; salieron Q350 en gastos y los Q150 que sobraron regresaron a la caja.
    expect(await efectivo()).toBe(965_000);
    expect(m.publicador.publicados.map(({ nombre }) => nombre)).toEqual([
      'caja-chica.comprobante_asignado',
      'caja-chica.comprobante_asignado',
    ]);
  });

  it('si se gastó de más no regresa nada y la diferencia sale de la caja', async () => {
    const vale = await entregar({ monto: '100.00' });

    const dto = await liquidar(vale.id, {
      valesDeGasto: [gasto({ monto: '150.00' })],
      permisos: { ...SIN_EXCEPCIONES, sobreElTope: true },
    });

    expect(dto).toMatchObject({ estado: 'liquidado', devuelto: '0.00', gastado: '150.00' });
    expect(await efectivo()).toBe(985_000);
  });

  it('sin comprobantes regresa todo el vale', async () => {
    const vale = await entregar();

    expect(await liquidar(vale.id)).toMatchObject({ estado: 'liquidado', devuelto: '500.00', gastado: '0.00' });
    expect(await efectivo()).toBe(1_000_000);
  });

  it('una nota de crédito resta de lo gastado', async () => {
    const vale = await entregar();
    const factura = await enLaBandeja(30_000);
    const facturaDelLibro = [...m.comprobantes.filas.values()].find((c) => c.id === factura)!.documentoDeCompraId;
    const nota = await enLaBandeja(5_000, { tipo: 'nota_de_credito', documentoAfectadoId: facturaDelLibro });

    const dto = await liquidar(vale.id, { documentos: [{ comprobanteId: factura }, { comprobanteId: nota }] });

    expect(dto).toMatchObject({ gastado: '250.00', devuelto: '250.00' });
  });

  it('solo se liquida un vale abierto, con una fecha entre su entrega y hoy', async () => {
    const vale = await entregar({ fecha: '2026-11-05' });

    await expect(liquidar(vale.id, { fecha: '2026-11-04' })).rejects.toMatchObject({
      codigo: 'fecha_del_vale_invalida',
    });
    await expect(liquidar(vale.id, { fecha: '2026-11-19' })).rejects.toMatchObject({
      codigo: 'fecha_del_vale_invalida',
    });
    await liquidar(vale.id, { fecha: '2026-11-10' });
    await expect(liquidar(vale.id)).rejects.toMatchObject({ codigo: 'vale_no_esta_abierto' });
  });

  it('un documento que ya está en un fondo, o que no existe, no justifica el vale', async () => {
    const vale = await entregar();
    const asignado = await enLaBandeja(10_000);
    await liquidar((await entregar({ monto: '100.00' })).id, { documentos: [{ comprobanteId: asignado }] });

    await expect(liquidar(vale.id, { documentos: [{ comprobanteId: asignado }] })).rejects.toMatchObject({
      codigo: 'comprobante_ya_asignado',
    });
    await expect(liquidar(vale.id, { documentos: [{ comprobanteId: 'no-existe' }] })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('un documento con retención pide el permiso de excepción y su motivo', async () => {
    const conRetencion = await enLaBandeja(30_000, { retencionesCentavos: 1_000 });
    const intento = async (permisos: PeticionDeLiquidarVale['permisos']) =>
      liquidar((await entregar()).id, { documentos: [{ comprobanteId: conRetencion }], permisos });

    await expect(intento(SIN_EXCEPCIONES)).rejects.toMatchObject({ codigo: 'retencion_sin_permiso' });
    await expect(intento({ ...SIN_EXCEPCIONES, conRetencion: true })).rejects.toMatchObject({
      codigo: 'motivo_con_retencion_obligatorio',
    });
  });

  it('gastar más de lo que hay en la caja se rechaza', async () => {
    m.config.topePorOmisionCentavos = 0;
    const vale = await entregar({ monto: '9000.00' });
    const grande = await enLaBandeja(1_100_000);

    await expect(liquidar(vale.id, { documentos: [{ comprobanteId: grande }] })).rejects.toMatchObject({
      codigo: 'comprobantes_mayores_que_el_efectivo',
    });
  });
});

describe('AnularVale', () => {
  it('anula un vale abierto, devuelve el efectivo a la caja y audita `anular` con el vale como estaba', async () => {
    const vale = await entregar();

    const dto = await new AnularVale(m.dependenciasDeVales).ejecutar(operador, {
      valeId: vale.id,
      motivo: 'Ya no se compró',
    });

    expect(dto).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Ya no se compró', fechaDeAnulacion: HOY });
    expect(await efectivo()).toBe(1_000_000);
    expect(m.auditoria.entradas).toMatchObject([
      { recurso: 'caja-chica.vales-provisionales', accion: 'anular', registroId: vale.id, motivo: 'Ya no se compró' },
    ]);
    expect(m.auditoria.entradas[0]!.anterior).toMatchObject({ estado: 'abierto', monto: '500.00' });
  });

  it('no anula un vale liquidado, uno ya anulado ni uno con comprobantes', async () => {
    const anular = (valeId: string) =>
      new AnularVale(m.dependenciasDeVales).ejecutar(operador, { valeId, motivo: 'x' });
    const liquidado = await entregar();
    await liquidar(liquidado.id);
    const anulado = await entregar();
    await anular(anulado.id);
    const conGastos = await entregar();
    await m.comprobantes.agregarVale({
      fondoId: FONDO_ID,
      fecha: HOY,
      montoCentavos: 5_000,
      descripcion: 'Peaje',
      pagadoA: 'Pedro',
      conceptoDeGastoId: 'concepto-1',
      motivoSinDocumento: 'No da factura',
      motivoSobreElTope: null,
      numero: 99,
      anioDeNumero: 0,
      asignadoPor: operador.usuarioId,
      valeProvisionalId: conGastos.id,
    });

    await expect(anular(liquidado.id)).rejects.toMatchObject({ codigo: 'vale_no_esta_abierto' });
    await expect(anular(anulado.id)).rejects.toMatchObject({ codigo: 'vale_no_esta_abierto' });
    await expect(anular(conGastos.id)).rejects.toMatchObject({ codigo: 'vale_con_comprobantes' });
  });
});
