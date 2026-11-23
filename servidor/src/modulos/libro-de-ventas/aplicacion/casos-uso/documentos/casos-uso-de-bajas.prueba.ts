import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  CausaDeAnulacionInvalida,
  DestinoInactivo,
  DestinoNoAdmitido,
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoProcesado,
  DocumentoYaAnulado,
  FechaDeAnulacionInvalida,
  MotivoDeAnulacionInvalido,
  NotaDeDebitoSostieneNotasDeCredito,
} from '../../../dominio/errores-de-baja.js';
import { AVISO_DE_PLAZO_DE_ANULACION_VENCIDO } from '../../../dominio/plazo-de-anulacion-en-la-sat.js';
import { CarteraRechaza } from '../../../pruebas/vecinos-de-ventas-en-memoria.soporte.js';
import {
  armarEscenarioDeVentas,
  solicitudDeVenta,
  type EscenarioDeVentas,
} from '../../../pruebas/escenario-de-ventas.soporte.js';
import { PeriodoDeclarado } from '../../errores.js';

let e: EscenarioDeVentas;

beforeEach(() => {
  e = armarEscenarioDeVentas();
});

const registrar = async (cambios = {}) => (await e.registrar.ejecutar(e.operador, solicitudDeVenta(cambios))).documento;
const anular = (documentoId: string, cambios = {}) =>
  e.anular.ejecutar(e.operador, { documentoId, causa: 'error_de_captura', motivo: 'Error al capturar', ...cambios });
const eliminar = (documentoId: string) => e.eliminar.ejecutar(e.operador, documentoId);

describe('anular', () => {
  it('deja el documento anulado con su causa, motivo y fecha, lo audita con la ficha anterior y publica el evento', async () => {
    const original = await registrar();

    const { documento } = await anular(original.id, { causa: 'no_corresponde_a_la_empresa', motivo: 'No es nuestra' });

    expect(documento).toMatchObject({
      estado: 'anulado',
      puedeAnular: false,
      anulacion: { motivo: 'No es nuestra', causa: 'no_corresponde_a_la_empresa', fecha: '2026-04-20' },
    });
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'libro-de-ventas.documentos',
        registroId: original.id,
        accion: 'anular',
        motivo: 'no_corresponde_a_la_empresa: No es nuestra',
        anterior: expect.objectContaining({ id: original.id, estado: 'vigente' }),
      }),
    ]);
    expect(e.publicadorEventos.nombres()).toContain('libro-de-ventas.documento_anulado');
  });

  it('exige causa y motivo, y una fecha de la SAT que no sea anterior a la emisión ni futura', async () => {
    const original = await registrar();

    await expect(anular(original.id, { causa: 'porque sí' })).rejects.toThrow(CausaDeAnulacionInvalida);
    await expect(anular(original.id, { motivo: '  ' })).rejects.toThrow(MotivoDeAnulacionInvalido);
    await expect(anular(original.id, { fechaDeAnulacion: '2026-03-01' })).rejects.toThrow(FechaDeAnulacionInvalida);
    await expect(anular(original.id, { fechaDeAnulacion: '2026-04-21' })).rejects.toThrow(FechaDeAnulacionInvalida);
    const { documento } = await anular(original.id, { fechaDeAnulacion: '2026-03-20' });
    expect(documento.anulacion!.fecha).toBe('2026-03-20');
  });

  it('un documento que no existe o ya está anulado no se anula', async () => {
    const original = await registrar();
    await anular(original.id);

    await expect(anular(original.id)).rejects.toThrow(DocumentoYaAnulado);
    await expect(anular(crypto.randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('una factura con notas vigentes no se anula hasta anular sus notas', async () => {
    const factura = await registrar();
    const nota = await registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.id,
      fechaEmision: '2026-03-20',
    });

    await expect(anular(factura.id)).rejects.toThrow(DocumentoConNotasVigentes);
    await anular(nota.id);
    await expect(anular(factura.id)).resolves.toBeDefined();
  });

  it('una nota de débito no se anula si las notas de crédito de la factura dejan de caber', async () => {
    const factura = await registrar();
    const debito = await registrar({
      tipo: 'nota_de_debito',
      documentoAfectadoId: factura.id,
      fechaEmision: '2026-03-18',
    });
    const credito = [{ ...solicitudDeVenta().lineas[0]!, total: '224.00' }];
    await registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.id,
      fechaEmision: '2026-03-20',
      lineas: credito,
    });

    await expect(anular(debito.id)).rejects.toThrow(NotaDeDebitoSostieneNotasDeCredito);
    expect(e.repositorio.lecturas).toContainEqual({ id: factura.id, bloquear: true });
  });

  it('el mes declarado se rechaza con el control encendido y solo avisa con él apagado', async () => {
    const original = await registrar();
    e.control.declarados.add('2026-03-01');
    e.control.bloquea = true;
    await expect(anular(original.id)).rejects.toThrow(PeriodoDeclarado);

    e.control.bloquea = false;
    const { avisos } = await anular(original.id);

    expect(avisos).toContain('El período 2026-03 ya se declaró: rectifique su declaración.');
  });

  it('avisa a la cartera antes de anular y, si ella rechaza, el documento sigue vigente', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
    const original = await registrar();
    e.destinos.rechazar = true;

    await expect(anular(original.id)).rejects.toThrow(CarteraRechaza);
    expect((await e.obtener.ejecutar(e.operador, original.id)).estado).toBe('vigente');
    e.destinos.rechazar = false;
    await anular(original.id, { motivo: 'Ahora sí' });
    expect(e.destinos.avisosDeBaja.at(-1)).toEqual({ aviso: 'anular', documentoId: original.id, motivo: 'Ahora sí' });
  });

  it('si el módulo de la cartera ya no está activo, no se da de baja lo que está en ella', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
    const original = await registrar();
    e.destinos.activosDeLaCuenta = [];

    await expect(anular(original.id)).rejects.toThrow(DestinoInactivo);
  });
});

describe('plazo de anulación en la SAT', () => {
  const conFel = (cambios = {}) => registrar({ tipoDte: 'FACT', autorizacionFel: crypto.randomUUID(), ...cambios });

  it('un error de captura de un DTE cuyo plazo pasó avisa que solo cabe una nota de crédito', async () => {
    const vencido = await conFel({ fechaEmision: '2026-01-15' });

    const { avisos } = await anular(vencido.id);

    expect(avisos).toContain(AVISO_DE_PLAZO_DE_ANULACION_VENCIDO);
  });

  it('dentro del plazo, con otra causa o sin FEL no avisa', async () => {
    const enPlazo = await conFel({ fechaEmision: '2026-03-15' });
    const otraCausa = await conFel({ fechaEmision: '2026-01-15' });
    const papel = await registrar({ fechaEmision: '2026-01-15' });

    expect((await anular(enPlazo.id)).avisos).toEqual([]);
    expect((await anular(otraCausa.id, { causa: 'fel_anulada_en_la_sat' })).avisos).toEqual([]);
    expect((await anular(papel.id)).avisos).toEqual([]);
  });
});

describe('eliminar', () => {
  it('borra el documento, lo audita con la ficha anterior y publica el evento', async () => {
    const original = await registrar();

    const { avisos } = await eliminar(original.id);

    expect(avisos).toEqual([]);
    expect(e.repositorio.guardados.has(original.id)).toBe(false);
    expect(e.auditoria.acciones()).toEqual(['libro-de-ventas.documentos:eliminar']);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ id: original.id, numero: original.numero });
    expect(e.publicadorEventos.nombres()).toContain('libro-de-ventas.documento_eliminado');
  });

  it('lo anulado, lo procesado por la cartera y lo que tiene notas no se elimina', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
    const anulado = await registrar();
    await anular(anulado.id);
    const procesado = await registrar();
    await e.marcarProcesado.ejecutar(e.operador, { documentoId: procesado.id, procesado: true });
    const conNota = await registrar();
    const nota = await registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: conNota.id,
      fechaEmision: '2026-03-20',
    });
    await anular(nota.id);

    await expect(eliminar(anulado.id)).rejects.toThrow(DocumentoYaAnulado);
    await expect(eliminar(procesado.id)).rejects.toThrow(DocumentoProcesado);
    await expect(eliminar(conNota.id)).rejects.toThrow(DocumentoConNotas);
    expect(e.auditoria.acciones().filter((accion) => accion.endsWith('eliminar'))).toEqual([]);
  });

  it('avisa a la cartera, y si ella rechaza no se borra nada', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
    const original = await registrar();
    e.destinos.rechazar = true;

    await expect(eliminar(original.id)).rejects.toThrow(CarteraRechaza);
    expect(e.repositorio.guardados.has(original.id)).toBe(true);
    expect(e.destinos.avisosDeBaja).toEqual([{ aviso: 'eliminar', documentoId: original.id }]);
  });

  it('el mes declarado no admite eliminar con el control encendido', async () => {
    const original = await registrar();
    e.control.declarados.add('2026-03-01');
    e.control.bloquea = true;

    await expect(eliminar(original.id)).rejects.toThrow(PeriodoDeclarado);
  });

  it('una nota de débito no se elimina si las notas de crédito dejan de caber', async () => {
    const factura = await registrar();
    const debito = await registrar({
      tipo: 'nota_de_debito',
      documentoAfectadoId: factura.id,
      fechaEmision: '2026-03-18',
    });
    const credito = [{ ...solicitudDeVenta().lineas[0]!, total: '224.00' }];
    await registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.id,
      fechaEmision: '2026-03-20',
      lineas: credito,
    });

    await expect(eliminar(debito.id)).rejects.toThrow(NotaDeDebitoSostieneNotasDeCredito);
  });
});

describe('marcar procesado (orden de la cartera)', () => {
  it('marca y desmarca, y lo procesado solo se anula', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
    const original = await registrar();

    await e.marcarProcesado.ejecutar(e.operador, { documentoId: original.id, procesado: true });
    expect(await e.obtener.ejecutar(e.operador, original.id)).toMatchObject({ procesado: true, puedeEliminar: false });
    await e.marcarProcesado.ejecutar(e.operador, { documentoId: original.id, procesado: false });

    expect(await e.obtener.ejecutar(e.operador, original.id)).toMatchObject({ procesado: false, puedeEliminar: true });
  });

  it('un documento sin cartera, anulado o inexistente no se marca', async () => {
    const sinCartera = await registrar();
    const anulado = await registrar();
    await anular(anulado.id);

    await expect(
      e.marcarProcesado.ejecutar(e.operador, { documentoId: sinCartera.id, procesado: true }),
    ).rejects.toThrow(DestinoNoAdmitido);
    await expect(e.marcarProcesado.ejecutar(e.operador, { documentoId: anulado.id, procesado: true })).rejects.toThrow(
      DocumentoYaAnulado,
    );
    await expect(
      e.marcarProcesado.ejecutar(e.operador, { documentoId: crypto.randomUUID(), procesado: true }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});
