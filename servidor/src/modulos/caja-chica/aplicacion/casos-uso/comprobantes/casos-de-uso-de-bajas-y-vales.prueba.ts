import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { AnularComprobante } from './anular-comprobante.js';
import { DevolverALaBandeja } from './devolver-a-la-bandeja.js';
import { armarEscenario, FONDO_ID, HOY, type EscenarioEnMemoria } from './dobles-de-comprobantes.soporte.js';
import { RecibirDocumento } from './recibir-documento.js';
import { RegistrarValeDeGasto, type PeticionDeVale } from './registrar-vale-de-gasto.js';

const operador = operadorDePrueba();
let m: EscenarioEnMemoria;
const FONDO = FONDO_ID;

const documento = (cambios: Partial<DocumentoParaDestino> = {}): DocumentoParaDestino => ({
  documentoId: crypto.randomUUID(),
  tipo: 'factura',
  proveedorId: 'proveedor-1',
  documentoAfectadoId: null,
  fechaEmision: HOY,
  totalCentavos: 112_000,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});

/** Un documento recibido y asignado al fondo; devuelve su id de documento y de comprobante. */
async function enElFondo(cambios: Partial<DocumentoParaDestino> = {}) {
  const recibido = documento({ ...cambios, referenciaDeDestino: FONDO });
  await new RecibirDocumento(m.dependencias).ejecutar(operador, recibido);
  const comprobante = [...m.comprobantes.filas.values()].find((c) => c.documentoDeCompraId === recibido.documentoId)!;
  expect(comprobante.fondoId, 'debía quedar asignado').toBe(FONDO);
  return { documentoId: recibido.documentoId, id: comprobante.id };
}

const vale = (cambios: Partial<PeticionDeVale> = {}): PeticionDeVale => ({
  fondoId: FONDO,
  monto: '50.00',
  descripcion: 'Peaje',
  pagadoA: 'Pedro',
  conceptoDeGastoId: 'concepto-1',
  motivoSinDocumento: 'No da factura',
  puedeSobreElTope: false,
  ...cambios,
});

beforeEach(async () => {
  m = await armarEscenario(1_000_000);
  m.publicador.publicados.length = 0;
});

describe('DevolverALaBandeja', () => {
  it('lo saca del fondo, limpia la excepción, audita `corregir` con el comprobante como estaba y publica comprobante_quitado', async () => {
    const { id } = await enElFondo();
    m.publicador.publicados.length = 0;

    const dto = await new DevolverALaBandeja(m.dependencias).ejecutar(operador, {
      comprobanteId: id,
      motivo: 'Fondo equivocado',
    });

    expect(dto).toMatchObject({ fondoId: null, asignadoEn: null, sobreElTope: false, motivoConRetencion: null });
    expect(m.auditoria.entradas).toMatchObject([{ accion: 'corregir', registroId: id, motivo: 'Fondo equivocado' }]);
    expect(m.auditoria.entradas[0]!.anterior).toMatchObject({ fondoId: FONDO, monto: '1120.00' });
    expect(m.publicador.publicados[0]).toMatchObject({
      nombre: 'caja-chica.comprobante_quitado',
      datos: { fondoId: FONDO, motivo: 'devuelto_a_la_bandeja', montoCentavos: 112_000 },
    });
  });

  it('no devuelve lo que está en la bandeja, un vale, algo repuesto, anulado ni una factura con notas en el fondo', async () => {
    const caso = new DevolverALaBandeja(m.dependencias);
    const devolver = (comprobanteId: string) => caso.ejecutar(operador, { comprobanteId, motivo: 'x' });
    const { id, documentoId } = await enElFondo();
    await enElFondo({ tipo: 'nota_de_credito', documentoAfectadoId: documentoId, totalCentavos: 11_200 });
    await new RecibirDocumento(m.dependencias).ejecutar(operador, documento());
    const enLaBandeja = [...m.comprobantes.filas.values()].find((c) => c.fondoId === null)!;
    const { comprobantes } = await new RegistrarValeDeGasto(m.dependencias).ejecutar(operador, vale());

    await expect(devolver(enLaBandeja.id)).rejects.toMatchObject({ codigo: 'documento_ya_esta_en_la_bandeja' });
    await expect(devolver(comprobantes[0]!.id)).rejects.toMatchObject({
      codigo: 'solo_un_documento_vuelve_a_la_bandeja',
    });
    await expect(devolver(id)).rejects.toMatchObject({ codigo: 'factura_con_notas_en_el_fondo' });
    m.comprobantes.filas.set(id, { ...m.comprobantes.filas.get(id)!, reposicionNumero: 4 });
    await expect(devolver(id)).rejects.toMatchObject({ codigo: 'comprobante_repuesto' });
    await expect(devolver('no-existe')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });

  it('sacar una nota de crédito sube lo pendiente: con el efectivo justo se rechaza', async () => {
    const chico = await armarEscenario(112_000);
    const caso = new RecibirDocumento(chico.dependencias);
    const factura = documento({ referenciaDeDestino: FONDO });
    await caso.ejecutar(operador, factura);
    await caso.ejecutar(
      operador,
      documento({
        tipo: 'nota_de_credito',
        documentoAfectadoId: factura.documentoId,
        totalCentavos: 11_200,
        referenciaDeDestino: FONDO,
      }),
    );
    await caso.ejecutar(operador, documento({ totalCentavos: 11_200, referenciaDeDestino: FONDO }));
    const nota = [...chico.comprobantes.filas.values()].find((c) => c.esNotaDeCredito)!;

    await expect(
      new DevolverALaBandeja(chico.dependencias).ejecutar(operador, { comprobanteId: nota.id, motivo: 'x' }),
    ).rejects.toMatchObject({ codigo: 'comprobantes_mayores_que_el_efectivo' });
  });
});

describe('RegistrarValeDeGasto', () => {
  it('guarda el vale con su número correlativo, sin deducción, y publica comprobante_asignado', async () => {
    const caso = new RegistrarValeDeGasto(m.dependencias);

    const primero = await caso.ejecutar(operador, vale());
    const segundo = await caso.ejecutar(operador, vale({ monto: '12.50' }));

    expect(primero.comprobantes[0]).toMatchObject({
      clase: 'vale_de_gasto',
      numero: 1,
      monto: '50.00',
      fecha: HOY,
      sobreElTope: false,
    });
    expect(segundo.comprobantes[0]).toMatchObject({ numero: 2, monto: '12.50' });
    expect(m.publicador.publicados[0]).toMatchObject({
      nombre: 'caja-chica.comprobante_asignado',
      datos: {
        clase: 'vale_de_gasto',
        deducible: false,
        conceptoDeGastoId: 'concepto-1',
        resta: false,
        montoCentavos: 5_000,
      },
    });
    expect(m.auditoria.entradas).toEqual([]);
  });

  it('con la opción apagada, un concepto inactivo, un monto en cero o una fecha futura se rechaza', async () => {
    const caso = new RegistrarValeDeGasto(m.dependencias);

    m.config.valesPermitidos = false;
    await expect(caso.ejecutar(operador, vale())).rejects.toMatchObject({ codigo: 'vales_de_gasto_no_permitidos' });
    m.config.valesPermitidos = true;
    await expect(caso.ejecutar(operador, vale({ conceptoDeGastoId: 'otro' }))).rejects.toMatchObject({
      codigo: 'concepto_de_gasto_invalido',
    });
    await expect(caso.ejecutar(operador, vale({ monto: '0' }))).rejects.toMatchObject({
      codigo: 'monto_del_comprobante_invalido',
    });
    await expect(caso.ejecutar(operador, vale({ fecha: '2026-12-31' }))).rejects.toMatchObject({
      codigo: 'fecha_del_comprobante_invalida',
    });
    expect(m.comprobantes.filas.size).toBe(0);
  });

  it('pasar del tope del vale pide el permiso y el motivo; un tope en cero es sin tope', async () => {
    const caso = new RegistrarValeDeGasto(m.dependencias);

    await expect(caso.ejecutar(operador, vale({ monto: '250.00' }))).rejects.toMatchObject({
      codigo: 'vale_de_gasto_sobre_el_tope',
    });
    await expect(caso.ejecutar(operador, vale({ monto: '250.00', puedeSobreElTope: true }))).rejects.toMatchObject({
      codigo: 'motivo_sobre_el_tope_obligatorio',
    });
    const conMotivo = await caso.ejecutar(
      operador,
      vale({ monto: '250.00', puedeSobreElTope: true, motivoSobreElTope: 'Urgente' }),
    );
    m.config.topeDelValeCentavos = 0;
    const sinTope = await caso.ejecutar(operador, vale({ monto: '900.00' }));

    expect(conMotivo.comprobantes[0]).toMatchObject({ sobreElTope: true, motivoSobreElTope: 'Urgente' });
    expect(sinTope.comprobantes[0]).toMatchObject({ sobreElTope: false });
  });

  it('el efectivo del fondo debe alcanzar', async () => {
    const chico = await armarEscenario(10_000);

    await expect(
      new RegistrarValeDeGasto(chico.dependencias).ejecutar(operador, vale({ monto: '100.01' })),
    ).rejects.toMatchObject({
      codigo: 'comprobantes_mayores_que_el_efectivo',
    });
    await expect(
      new RegistrarValeDeGasto(chico.dependencias).ejecutar(
        operador,
        vale({ monto: '100.00', puedeSobreElTope: true, motivoSobreElTope: 'x' }),
      ),
    ).resolves.toBeDefined();
  });
});

describe('AnularComprobante', () => {
  it('anula un vale con su motivo, audita `anular` con el vale como estaba y publica comprobante_quitado', async () => {
    const creado = await new RegistrarValeDeGasto(m.dependencias).ejecutar(operador, vale());
    const id = creado.comprobantes[0]!.id;
    m.publicador.publicados.length = 0;

    const dto = await new AnularComprobante(m.dependencias).ejecutar(operador, {
      comprobanteId: id,
      motivo: 'Duplicado',
    });

    expect(dto).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Duplicado' });
    expect(m.auditoria.entradas).toMatchObject([{ accion: 'anular', registroId: id, motivo: 'Duplicado' }]);
    expect(m.auditoria.entradas[0]!.anterior).toMatchObject({ estado: 'vigente', clase: 'vale_de_gasto' });
    expect(m.publicador.nombres()).toEqual(['caja-chica.comprobante_quitado']);
  });

  it('no anula un documento, uno ya anulado ni un vale repuesto', async () => {
    const caso = new AnularComprobante(m.dependencias);
    const { id } = await enElFondo();
    const creado = await new RegistrarValeDeGasto(m.dependencias).ejecutar(operador, vale());
    const idVale = creado.comprobantes[0]!.id;

    await expect(caso.ejecutar(operador, { comprobanteId: id, motivo: 'x' })).rejects.toMatchObject({
      codigo: 'solo_el_vale_de_gasto_se_anula',
    });
    m.comprobantes.filas.set(idVale, { ...m.comprobantes.filas.get(idVale)!, reposicionNumero: 2 });
    await expect(caso.ejecutar(operador, { comprobanteId: idVale, motivo: 'x' })).rejects.toMatchObject({
      codigo: 'comprobante_repuesto',
    });
    m.comprobantes.filas.set(idVale, { ...m.comprobantes.filas.get(idVale)!, reposicionNumero: null });
    await caso.ejecutar(operador, { comprobanteId: idVale, motivo: 'x' });
    await expect(caso.ejecutar(operador, { comprobanteId: idVale, motivo: 'x' })).rejects.toMatchObject({
      codigo: 'comprobante_ya_anulado',
    });
  });
});
