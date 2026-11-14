/** U8l-3: lo que hace `RecibirDocumento` con una nota que cita una factura del sistema anterior (§4.3 del diseño). */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../core/contratos/libro-de-compras.contratos.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import {
  AplicacionesEnMemoria,
  CondicionesEnMemoria,
  DocumentosDeCompraEnMemoria,
  DocumentosEnMemoria,
  PlazoFijo,
} from '../../pruebas/dobles-de-documentos.js';
import { REGLAS_PARA_ANULAR } from '../../dominio/reglas-de-baja.js';
import { AnularPorAviso } from './bajas/anular-por-aviso.js';
import { RecibirDocumento } from './recibir-documento.js';

const PROVEEDOR = crypto.randomUUID();
const operador = operadorDePrueba();
const RETENCION = 'Si la factura tuvo retención, parte de este saldo puede corresponder a ella.';

let aplicaciones: AplicacionesEnMemoria;
let documentos: DocumentosEnMemoria;
let recibir: RecibirDocumento;

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  recibir = new RecibirDocumento({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    documentos,
    aplicaciones,
    cargos: documentos,
    condiciones: new CondicionesEnMemoria(),
    documentosDeCompra: new DocumentosDeCompraEnMemoria(),
    plazo: new PlazoFijo(1),
  });
});

/** Un saldo inicial de Q1,000.00 pendientes (de una factura de Q1,120.00) del proveedor. */
function saldoInicial(cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar {
  const saldo: DocumentoPorPagar = {
    id: crypto.randomUUID(),
    origen: 'saldo_inicial',
    documentoId: null,
    serie: 'ANT',
    numero: '77',
    tipo: 'factura',
    proveedorId: PROVEEDOR,
    documentoAfectadoId: null,
    facturaDelSistemaAnterior: false,
    fechaEmision: '2025-12-20',
    totalCentavos: 112000,
    retencionesCentavos: 0,
    saldoAlInicioCentavos: 100000,
    retencionesPorPracticarCentavos: 0,
    referencia: null,
    tieneActivoFijo: false,
    vencimiento: '2026-01-20',
    estado: 'registrado',
    ingresadoPor: null,
    registradoEn: 'ahora',
    registradoPor: null,
    autorizadoEn: null,
    autorizadoPor: null,
    autorizacionPropia: false,
    ...cambios,
  };
  documentos.documentos.push(saldo);
  return saldo;
}

const nota = (cambios: Partial<DocumentoParaDestino> = {}): DocumentoParaDestino => ({
  documentoId: crypto.randomUUID(),
  tipo: 'nota_de_credito',
  proveedorId: PROVEEDOR,
  documentoAfectadoId: null,
  facturaAnterior: { tipo: 'factura', serie: 'ANT', numero: '77', fechaEmision: '2025-12-20' },
  fechaEmision: '2026-02-10',
  totalCentavos: 30000,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});

const guardadaDe = (documentoId: string) => documentos.documentos.find((d) => d.documentoId === documentoId)!;

describe('nota de crédito sobre un saldo inicial', () => {
  it('se enlaza al saldo inicial, se marca del sistema anterior y se aplica sola', async () => {
    const saldo = saldoInicial();
    const credito = nota();

    const { avisos } = await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId)).toMatchObject({
      documentoAfectadoId: saldo.id,
      facturaDelSistemaAnterior: true,
      vencimiento: null,
    });
    expect(documentos.saldoDe(saldo)).toBe(70000);
    expect(aplicaciones.datos).toEqual([{ forma: 'automatica', fecha: expect.any(String), referencia: null }]);
    expect(avisos).toEqual([]);
  });

  it('bloquea el saldo inicial al buscarlo', async () => {
    saldoInicial();

    await recibir.ejecutar(operador, nota());

    expect(documentos.bitacora).toContain('bloquea-saldo-inicial');
  });

  it('el saldo inicial ya pagado en parte y una nota mayor que su saldo dejan el resto libre, con el aviso de retención', async () => {
    const saldo = saldoInicial({ saldoAlInicioCentavos: 20000 });
    const credito = nota({ totalCentavos: 50000 });

    const { avisos } = await recibir.ejecutar(operador, credito);

    expect(documentos.saldoDe(saldo)).toBe(0);
    expect(aplicaciones.saldoLibreDe(guardadaDe(credito.documentoId))).toBe(30000);
    expect(avisos).toEqual([expect.stringContaining('Esta nota deja Q300.00 a favor de la empresa'), RETENCION]);
  });

  it('se aplica al saldo inicial y luego a las notas de débito ligadas a él', async () => {
    const saldo = saldoInicial({ saldoAlInicioCentavos: 10000 });
    const debito = nota({ tipo: 'nota_de_debito', totalCentavos: 5000 });
    await recibir.ejecutar(operador, debito);
    const credito = nota({ totalCentavos: 12000 });

    await recibir.ejecutar(operador, credito);

    expect(documentos.saldoDe(saldo)).toBe(0);
    expect(documentos.saldoDe(guardadaDe(debito.documentoId))).toBe(3000);
    expect(aplicaciones.saldoLibreDe(guardadaDe(credito.documentoId))).toBe(0);
  });

  it('avisa de las retenciones por practicar del saldo inicial', async () => {
    saldoInicial({ retencionesPorPracticarCentavos: 4500 });

    const { avisos } = await recibir.ejecutar(operador, nota());

    expect(avisos).toEqual([
      'El saldo inicial ANT-77 tiene Q45.00 de retenciones por practicar: revise si la nota cambia la retención que falta emitir.',
    ]);
  });

  it('avisa cuando la fecha de la factura que cita la nota no coincide con la del saldo inicial, y la enlaza igual', async () => {
    const saldo = saldoInicial();
    const credito = nota({
      facturaAnterior: { tipo: 'factura', serie: 'ANT', numero: '77', fechaEmision: '2025-12-21' },
    });

    const { avisos } = await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId).documentoAfectadoId).toBe(saldo.id);
    expect(avisos).toEqual(['El saldo inicial ANT-77 tiene fecha 20/12/2025 y la nota cita 21/12/2025; revise.']);
  });

  it('la familia de la factura no importa mientras sea de factura: encuentra el saldo de otra familia', async () => {
    const saldo = saldoInicial({ tipo: 'factura_pequeno_contribuyente' });
    const credito = nota();

    await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId).documentoAfectadoId).toBe(saldo.id);
  });

  it('el saldo de otro proveedor, de otro número o de otra serie no cuenta', async () => {
    saldoInicial({ proveedorId: crypto.randomUUID() });
    saldoInicial({ numero: '78' });
    saldoInicial({ serie: null });
    const credito = nota();

    await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId).documentoAfectadoId).toBeNull();
  });

  it('un saldo inicial anulado no cuenta', async () => {
    saldoInicial({ estado: 'anulado' });
    const credito = nota();

    await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId)).toMatchObject({
      documentoAfectadoId: null,
      facturaDelSistemaAnterior: true,
    });
  });
});

describe('nota de crédito sin saldo inicial', () => {
  it('queda libre por todo su total, marcada del sistema anterior, con los avisos de que no hay saldo inicial y de la retención', async () => {
    const credito = nota();

    const { avisos } = await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId)).toMatchObject({
      documentoAfectadoId: null,
      facturaDelSistemaAnterior: true,
    });
    expect(aplicaciones.lista).toEqual([]);
    expect(avisos).toEqual([
      'No hay un saldo inicial ANT-77 de este proveedor: la nota queda como saldo a favor de Q300.00; si la factura todavía se debe, cárguela en Saldos iniciales y aplique la nota en Notas de crédito.',
      RETENCION,
    ]);
  });

  it('una factura sin serie se nombra solo con su número', async () => {
    const credito = nota({
      facturaAnterior: { tipo: 'factura', serie: null, numero: '9', fechaEmision: '2025-12-20' },
    });

    const { avisos } = await recibir.ejecutar(operador, credito);

    expect(avisos[0]).toContain('No hay un saldo inicial 9 de este proveedor');
  });
});

describe('nota de débito sobre una factura del sistema anterior', () => {
  it('con saldo inicial es un cargo con su vencimiento, ligado a él, sin aplicaciones', async () => {
    const saldo = saldoInicial();
    const debito = nota({ tipo: 'nota_de_debito', fechaEmision: '2026-02-10' });

    const { avisos } = await recibir.ejecutar(operador, debito);

    expect(guardadaDe(debito.documentoId)).toMatchObject({
      documentoAfectadoId: saldo.id,
      facturaDelSistemaAnterior: true,
      vencimiento: '2026-03-10',
    });
    expect(aplicaciones.lista).toEqual([]);
    expect(avisos).toEqual([]);
  });

  it('sin saldo inicial es un cargo suelto, y lo avisa', async () => {
    const debito = nota({ tipo: 'nota_de_debito' });

    const { avisos } = await recibir.ejecutar(operador, debito);

    expect(guardadaDe(debito.documentoId)).toMatchObject({
      documentoAfectadoId: null,
      facturaDelSistemaAnterior: true,
      vencimiento: '2026-03-10',
    });
    expect(avisos).toEqual([
      'No hay un saldo inicial ANT-77 de este proveedor: la nota de débito queda como un cargo sin factura.',
    ]);
  });
});

describe('nota sobre una factura del libro', () => {
  it('sin factura del libro en Cuentas por pagar falla con un error propio', async () => {
    const huerfana = nota({ facturaAnterior: null, documentoAfectadoId: crypto.randomUUID() });

    await expect(recibir.ejecutar(operador, huerfana)).rejects.toMatchObject({
      codigo: 'factura_de_la_nota_no_recibida',
    });
  });

  it('no se marca como del sistema anterior', async () => {
    const factura = nota({ tipo: 'factura', facturaAnterior: null });
    await recibir.ejecutar(operador, factura);
    const credito = nota({ facturaAnterior: null, documentoAfectadoId: factura.documentoId });

    await recibir.ejecutar(operador, credito);

    expect(guardadaDe(credito.documentoId).facturaDelSistemaAnterior).toBe(false);
  });
});

describe('anular la nota desde el libro', () => {
  it('lo que la nota rebajó al saldo inicial vuelve a su saldo', async () => {
    const saldo = saldoInicial();
    const credito = nota();
    await recibir.ejecutar(operador, credito);
    expect(documentos.saldoDe(saldo)).toBe(70000);
    const anular = new AnularPorAviso({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      documentos,
      aplicaciones,
      auditoria: new AuditoriaEnMemoria(),
      publicadorEventos: new PublicadorEventosEnMemoria(),
      reglas: REGLAS_PARA_ANULAR,
    });

    await anular.ejecutar(operador, {
      documentoId: credito.documentoId,
      destino: 'cuentas-por-pagar',
      motivo: 'Error de captura',
    });

    expect(guardadaDe(credito.documentoId)?.estado).toBe('anulado');
    expect(documentos.saldoDe(saldo)).toBe(100000);
  });
});
