import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { AsignarDocumentos } from './asignar-documentos.js';
import { armarEscenario, FONDO_ID, HOY, type EscenarioEnMemoria } from './dobles-de-comprobantes.soporte.js';
import { RecibirDocumento } from './recibir-documento.js';

const operador = operadorDePrueba();
let m: EscenarioEnMemoria;

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

const FONDO_UUID = FONDO_ID;

beforeEach(async () => {
  m = await armarEscenario(1_000_000);
});

const recibir = (cambios: Partial<DocumentoParaDestino> = {}) =>
  new RecibirDocumento(m.dependencias).ejecutar(operador, documento(cambios));
const asignar = (
  comprobanteId: string,
  extra: Record<string, unknown> = {},
  permisos = { sobreElTope: false, conRetencion: false },
) =>
  new AsignarDocumentos(m.dependencias).ejecutar(operador, {
    fondoId: FONDO_UUID,
    documentos: [{ comprobanteId, ...extra }],
    permisos,
  });
const enLaBandeja = () => [...m.comprobantes.filas.values()].filter((c) => c.fondoId === null);

describe('AsignarDocumentos y la excepción de retención', () => {
  async function conRetencion() {
    await recibir({ totalCentavos: 560_000, retencionesCentavos: 9_000 });
    m.config.topePorOmisionCentavos = 0;
    return enLaBandeja()[0]!.id;
  }

  it('sin el permiso de excepción no se asigna: RetencionSinPermiso y sigue en la bandeja', async () => {
    const id = await conRetencion();

    await expect(asignar(id, { motivoConRetencion: 'Solo hay efectivo' })).rejects.toMatchObject({
      codigo: 'retencion_sin_permiso',
    });

    expect(m.comprobantes.filas.get(id)).toMatchObject({ fondoId: null, motivoConRetencion: null });
    expect(m.auditoria.entradas).toEqual([]);
  });

  it('con el permiso y sin motivo (o en blanco) pide el motivo', async () => {
    const id = await conRetencion();
    const permisos = { sobreElTope: false, conRetencion: true };

    await expect(asignar(id, {}, permisos)).rejects.toMatchObject({ codigo: 'motivo_con_retencion_obligatorio' });
    await expect(asignar(id, { motivoConRetencion: '   ' }, permisos)).rejects.toMatchObject({
      codigo: 'motivo_con_retencion_obligatorio',
    });
  });

  it('con los dos se asigna por el neto a nombre de quien autorizó y audita `autorizar` con el comprobante de la bandeja', async () => {
    const id = await conRetencion();

    const resultado = await asignar(
      id,
      { motivoConRetencion: '  Solo hay efectivo  ' },
      { sobreElTope: false, conRetencion: true },
    );

    expect(resultado.comprobantes[0]).toMatchObject({
      fondoId: FONDO_UUID,
      monto: '5510.00',
      motivoConRetencion: 'Solo hay efectivo',
    });
    expect(m.comprobantes.filas.get(id)).toMatchObject({ asignadoPor: operador.usuarioId });
    expect(m.auditoria.entradas).toMatchObject([
      { recurso: 'caja-chica.comprobantes', registroId: id, accion: 'autorizar', motivo: 'Solo hay efectivo' },
    ]);
    expect(m.auditoria.entradas[0]!.anterior).toMatchObject({
      fondoId: null,
      conRetencion: true,
      montoRetenido: '90.00',
    });
    expect(m.publicador.nombres()).toEqual(['caja-chica.comprobante_asignado']);
  });

  it('un motivo en un documento sin retención no se guarda: DatoInvalido', async () => {
    await recibir();
    const id = enLaBandeja()[0]!.id;

    await expect(
      asignar(id, { motivoConRetencion: 'No aplica' }, { sobreElTope: false, conRetencion: true }),
    ).rejects.toMatchObject({
      codigo: 'motivo_con_retencion_sin_retencion',
    });
  });
});

describe('AsignarDocumentos y el tope', () => {
  it('sobre el tope exige el permiso y el motivo; con los dos lo guarda marcado', async () => {
    m.config.topePorOmisionCentavos = 50_000;
    await recibir({ totalCentavos: 80_000 });
    const id = enLaBandeja()[0]!.id;

    await expect(asignar(id)).rejects.toMatchObject({ codigo: 'comprobante_sobre_el_tope' });
    await expect(asignar(id, {}, { sobreElTope: true, conRetencion: false })).rejects.toMatchObject({
      codigo: 'motivo_sobre_el_tope_obligatorio',
    });
    await asignar(id, { motivoSobreElTope: 'Urgente' }, { sobreElTope: true, conRetencion: false });

    expect(m.comprobantes.filas.get(id)).toMatchObject({
      sobreElTope: true,
      motivoSobreElTope: 'Urgente',
      fondoId: FONDO_UUID,
    });
  });

  it('el tope del propio fondo manda sobre el de la empresa', async () => {
    m.config.topePorOmisionCentavos = 10_000;
    await m.fondos.actualizar(FONDO_UUID, { topeCentavos: 90_000 });
    await recibir({ totalCentavos: 80_000 });

    await asignar(enLaBandeja()[0]!.id);

    expect([...m.comprobantes.filas.values()][0]).toMatchObject({ fondoId: FONDO_UUID, sobreElTope: false });
  });

  it('un tope en cero es sin tope', async () => {
    m.config.topePorOmisionCentavos = 0;
    await recibir({ totalCentavos: 90_000 });

    await asignar(enLaBandeja()[0]!.id);

    expect([...m.comprobantes.filas.values()][0]).toMatchObject({ fondoId: FONDO_UUID, sobreElTope: false });
  });
});

describe('AsignarDocumentos: nota, efectivo, fecha y bancarización', () => {
  it('en una tanda las notas van después de sus facturas, aunque vengan primero', async () => {
    const factura = documento();
    await new RecibirDocumento(m.dependencias).ejecutar(operador, factura);
    await recibir({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos: 56_000 });
    const [idFactura, idNota] = enLaBandeja().map((c) => c.id) as [string, string];

    const resultado = await new AsignarDocumentos(m.dependencias).ejecutar(operador, {
      fondoId: FONDO_UUID,
      documentos: [{ comprobanteId: idNota }, { comprobanteId: idFactura }],
      permisos: { sobreElTope: false, conRetencion: false },
    });

    expect(resultado.comprobantes.map(({ id }) => id)).toEqual([idFactura, idNota]);
    expect(m.comprobantes.pendienteDe(FONDO_UUID)).toBe(56_000);
  });

  it('una nota cuya factura está en la bandeja o en otro fondo se rechaza', async () => {
    const factura = documento();
    await new RecibirDocumento(m.dependencias).ejecutar(operador, factura);
    await recibir({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos: 56_000 });
    const nota = enLaBandeja().find((c) => c.esNotaDeCredito)!;

    await expect(asignar(nota.id)).rejects.toMatchObject({ codigo: 'nota_en_otro_fondo' });
  });

  it('lo ya asignado, lo que no existe y una fecha futura se rechazan', async () => {
    await recibir();
    const id = enLaBandeja()[0]!.id;

    await expect(asignar(id, { fecha: '2026-12-31' })).rejects.toMatchObject({
      codigo: 'fecha_del_comprobante_invalida',
    });
    await asignar(id);
    await expect(asignar(id)).rejects.toMatchObject({ codigo: 'comprobante_ya_asignado' });
    await expect(asignar('no-existe')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });

  it('con `bloquear` marca el comprobante y avisa; con `avisar` solo avisa', async () => {
    await recibir();
    await recibir();
    const [uno, dos] = enLaBandeja().map((c) => c.id) as [string, string];

    m.bancarizacion.resultado = 'bloquear';
    const bloqueado = await asignar(uno);
    m.bancarizacion.resultado = 'avisar';
    const avisado = await asignar(dos);

    expect(bloqueado.comprobantes[0]).toMatchObject({ sinBancarizar: true });
    expect(bloqueado.avisos).toEqual(['Bancarización: pasa del umbral.']);
    expect(avisado.comprobantes[0]).toMatchObject({ sinBancarizar: false });
    expect(avisado.avisos).toEqual(['Bancarización: pasa del umbral.']);
  });

  it('a la bancarización va el valor antes de retenciones; la nota de crédito no se evalúa', async () => {
    m.config.topePorOmisionCentavos = 0;
    const factura = documento({ totalCentavos: 560_000, retencionesCentavos: 9_000 });
    await new RecibirDocumento(m.dependencias).ejecutar(operador, factura);
    await asignar(
      enLaBandeja()[0]!.id,
      { motivoConRetencion: 'Solo efectivo' },
      { sobreElTope: false, conRetencion: true },
    );
    await recibir({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos: 11_200 });

    await asignar(enLaBandeja()[0]!.id);

    expect(m.bancarizacion.pedidos).toHaveLength(1);
    expect(m.bancarizacion.pedidos[0]).toMatchObject({
      proveedorId: 'proveedor-1',
      proveedorNombre: 'Veterinaria',
      fecha: HOY,
      montoEnEfectivoCentavos: 560_000,
      cargos: [{ documentoDeCompraId: factura.documentoId, totalCentavos: 560_000 }],
    });
  });

  it('con el efectivo justo pasa; un centavo más lo rechaza y no deja nada asignado', async () => {
    const chico = await armarEscenario(112_000);
    await chico.fondos.agregar({
      id: FONDO_UUID,
      nombre: 'x',
      localidadId: null,
      topeCentavos: null,
      cuentaBancariaId: null,
      fechaDeApertura: '2026-11-01',
    });
    const caso = new RecibirDocumento(chico.dependencias);
    await caso.ejecutar(operador, documento({ totalCentavos: 112_000 }));
    await caso.ejecutar(operador, documento({ totalCentavos: 1 }));
    const [justo, uno] = [...chico.comprobantes.filas.keys()] as [string, string];
    const asignarEn = (id: string) =>
      new AsignarDocumentos(chico.dependencias).ejecutar(operador, {
        fondoId: FONDO_UUID,
        documentos: [{ comprobanteId: id }],
        permisos: { sobreElTope: false, conRetencion: false },
      });

    await asignarEn(justo);
    await expect(asignarEn(uno)).rejects.toMatchObject({ codigo: 'comprobantes_mayores_que_el_efectivo' });
  });
});
