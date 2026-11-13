import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import { type AjusteAnulado, type AjusteRegistrado } from '../../../dominio/eventos-de-ajustes.js';
import { AjustesEnMemoria, TopeFijo } from '../../../pruebas/dobles-de-ajustes.js';
import { ConsultasEnMemoria } from '../../../pruebas/dobles-de-acciones.js';
import { CargaInicialFija, documentoSembrado, FechasDeEntradaFijas } from '../../../pruebas/dobles-de-aplicaciones.js';
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import { AjustarSaldo } from './ajustar-saldo.js';
import { AnularAjuste } from './anular-ajuste.js';

const operador = operadorDePrueba();
let documentos: DocumentosEnMemoria;
let fechas: FechasDeEntradaFijas;
let carga: CargaInicialFija;
let tope: TopeFijo;
let auditoria: AuditoriaEnMemoria;
let publicador: PublicadorEventosEnMemoria;
let ajustes: AjustesEnMemoria;
let ajustar: AjustarSaldo;
let anular: AnularAjuste;

beforeEach(() => {
  documentos = new DocumentosEnMemoria(new AplicacionesEnMemoria());
  fechas = new FechasDeEntradaFijas();
  carga = new CargaInicialFija();
  tope = new TopeFijo();
  auditoria = new AuditoriaEnMemoria();
  publicador = new PublicadorEventosEnMemoria();
  ajustes = new AjustesEnMemoria(documentos);
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    documentos,
    consultas: new ConsultasEnMemoria(documentos),
    ajustes,
    cargaInicial: carga,
    fechasDeEntrada: fechas,
    topeDeDiferencia: tope,
    auditoria,
    publicadorEventos: publicador,
    reloj: new RelojFijo('2026-06-01'),
  };
  ajustar = new AjustarSaldo(dependencias);
  anular = new AnularAjuste(dependencias);
});

/** Una nota de Q50.00 registrada, con su recepción en el libro (`null` la deja como saldo inicial). */
function nota(cambios: Partial<DocumentoPorPagar> = {}, recepcion: string | null = '2026-03-10'): DocumentoPorPagar {
  const documento = documentoSembrado({
    tipo: 'nota_de_credito',
    totalCentavos: 5000,
    vencimiento: null,
    estado: 'registrado',
    ...cambios,
  });
  documentos.documentos.push(documento);
  fechas.recepciones.set(documento.id, recepcion);
  return documento;
}

const pedido = (notaId: string, cambios: Record<string, unknown> = {}) => ({
  notaId,
  monto: '50.00',
  causa: 'no_recuperable',
  motivo: ' Cerró ',
  ...cambios,
});

describe('AjustarSaldo', () => {
  it('ajusta todo, audita con la ficha anterior y publica el evento con su efecto, serie y número', async () => {
    const origen = nota({ serie: 'N', numero: '9' });

    const ficha = await ajustar.ejecutar(operador, pedido(origen.id));

    expect(ficha).toMatchObject({ saldo: '0.00', ajustado: '50.00' });
    const [ajuste] = documentos.ajustes;
    expect(ajuste).toMatchObject({ montoCentavos: 5000, fecha: '2026-06-01', motivo: 'Cerró', estado: 'vigente' });
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.ajustes',
        accion: 'ajustar',
        registroId: ajuste!.id,
        motivo: 'Cerró',
        anterior: expect.objectContaining({ id: origen.id, ajustes: [] }),
      }),
    ]);
    const [evento] = publicador.publicados as AjusteRegistrado[];
    expect(evento!.nombre).toBe('cuentas-por-pagar.ajuste_registrado');
    expect(evento!.datos).toMatchObject({
      ajusteId: ajuste!.id,
      documentoId: origen.id,
      serie: 'N',
      numero: '9',
      montoCentavos: 5000,
      efecto: 'perdida',
      causa: 'no_recuperable',
    });
  });

  it('ajusta una parte y rechaza más que el saldo libre restante', async () => {
    const origen = nota();
    await ajustar.ejecutar(operador, pedido(origen.id, { monto: '20.00' }));

    await expect(ajustar.ejecutar(operador, pedido(origen.id, { monto: '30.01' }))).rejects.toMatchObject({
      codigo: 'ajuste_mayor_que_el_saldo_libre',
    });
    const ficha = await ajustar.ejecutar(operador, pedido(origen.id, { monto: '30.00' }));

    expect(ficha).toMatchObject({ saldo: '0.00', ajustado: '50.00' });
    expect(documentos.ajustes).toHaveLength(2);
  });

  it('rechaza una nota pendiente, anulada o que no es nota de crédito', async () => {
    const pendiente = nota({ estado: 'pendiente' });
    const anulada = nota({ estado: 'anulado' });
    const factura = nota({ tipo: 'factura' });

    await expect(ajustar.ejecutar(operador, pedido(pendiente.id))).rejects.toMatchObject({
      codigo: 'nota_pendiente_no_se_ajusta',
    });
    for (const rechazada of [anulada, factura]) {
      await expect(ajustar.ejecutar(operador, pedido(rechazada.id))).rejects.toMatchObject({
        codigo: 'no_es_nota_con_saldo',
      });
    }
    expect(documentos.ajustes).toEqual([]);
    expect(publicador.publicados).toEqual([]);
  });

  it('«Diferencia menor» respeta el tope de la empresa y con cero queda apagada', async () => {
    const origen = nota();
    const diferencia = (monto: string) =>
      ajustar.ejecutar(operador, pedido(origen.id, { monto, causa: 'diferencia_menor' }));

    await expect(diferencia('25.01')).rejects.toMatchObject({ codigo: 'diferencia_menor_sobre_el_tope' });
    await diferencia('25.00');
    tope.topeCentavos = 0;
    await expect(diferencia('0.01')).rejects.toMatchObject({ codigo: 'diferencia_menor_sobre_el_tope' });
    tope.topeCentavos = 3000;
    await diferencia('25.00');
    expect(documentos.ajustes).toHaveLength(2);
  });

  it('«Compensado con otra cuenta» exige referencia y publica efecto transitorio', async () => {
    const origen = nota();
    const compensar = (referencia?: string) =>
      ajustar.ejecutar(
        operador,
        pedido(origen.id, { monto: '10.00', causa: 'compensado_con_otra_cuenta', referencia }),
      );

    await expect(compensar()).rejects.toMatchObject({ codigo: 'referencia_obligatoria' });
    await expect(compensar('  ')).rejects.toMatchObject({ codigo: 'referencia_obligatoria' });
    await compensar('Recibo 5');

    const [evento] = publicador.publicados as AjusteRegistrado[];
    expect(evento!.datos).toMatchObject({ efecto: 'transitoria', referencia: 'Recibo 5' });
  });

  it('rechaza una fecha futura o anterior a la recepción; una nota de saldo inicial usa la fecha de inicio', async () => {
    const origen = nota();
    for (const fecha of ['2026-06-02', '2026-03-09']) {
      await expect(ajustar.ejecutar(operador, pedido(origen.id, { fecha }))).rejects.toMatchObject({
        codigo: 'fecha_de_ajuste_invalida',
      });
    }
    const inicial = nota({ origen: 'saldo_inicial', documentoId: null }, null);
    await expect(ajustar.ejecutar(operador, pedido(inicial.id, { fecha: '2025-12-31' }))).rejects.toMatchObject({
      codigo: 'fecha_de_ajuste_invalida',
    });

    await ajustar.ejecutar(operador, pedido(origen.id, { fecha: '2026-03-10', monto: '10.00' }));
    await ajustar.ejecutar(operador, pedido(inicial.id, { fecha: '2026-01-01', monto: '10.00' }));
    expect(documentos.ajustes.map(({ fecha }) => fecha)).toEqual(['2026-03-10', '2026-01-01']);
  });

  it('rechaza monto en cero, causa desconocida y motivo vacío', async () => {
    const origen = nota();

    await expect(ajustar.ejecutar(operador, pedido(origen.id, { monto: '0.00' }))).rejects.toMatchObject({
      codigo: 'monto_de_ajuste_invalido',
    });
    await expect(ajustar.ejecutar(operador, pedido(origen.id, { causa: 'otra' }))).rejects.toMatchObject({
      codigo: 'causa_de_ajuste_invalida',
    });
    await expect(ajustar.ejecutar(operador, pedido(origen.id, { motivo: '  ' }))).rejects.toMatchObject({
      codigo: 'motivo_invalido',
    });
  });
});

describe('AnularAjuste', () => {
  async function conUnAjuste() {
    const origen = nota();
    await ajustar.ejecutar(operador, pedido(origen.id, { monto: '30.00' }));
    publicador.publicados.length = 0;
    auditoria.entradas.length = 0;
    return { origen, ajusteId: documentos.ajustes[0]!.id };
  }

  it('devuelve el saldo, audita con el ajuste anterior y publica el evento de la anulación', async () => {
    const { origen, ajusteId } = await conUnAjuste();

    const ficha = await anular.ejecutar(operador, { ajusteId, motivo: ' Lo devolvió ' });

    expect(ficha).toMatchObject({ saldo: '50.00', ajustado: '0.00' });
    expect(documentos.ajustes[0]).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Lo devolvió' });
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.ajustes',
        accion: 'anular',
        registroId: ajusteId,
        motivo: 'Lo devolvió',
        anterior: expect.objectContaining({ id: ajusteId, monto: '30.00', estado: 'vigente' }),
      }),
    ]);
    const [evento] = publicador.publicados as AjusteAnulado[];
    expect(evento!.nombre).toBe('cuentas-por-pagar.ajuste_anulado');
    expect(evento!.datos).toEqual({
      empresaId: operador.empresaId,
      ajusteId,
      documentoId: origen.id,
      fecha: '2026-06-01',
      montoCentavos: 3000,
      efecto: 'perdida',
    });
  });

  it('no anula dos veces, pide motivo y rechaza un ajuste que no existe', async () => {
    const { ajusteId } = await conUnAjuste();

    await expect(anular.ejecutar(operador, { ajusteId, motivo: ' ' })).rejects.toMatchObject({
      codigo: 'motivo_invalido',
    });
    await anular.ejecutar(operador, { ajusteId, motivo: 'x' });
    await expect(anular.ejecutar(operador, { ajusteId, motivo: 'x' })).rejects.toMatchObject({
      codigo: 'ajuste_ya_anulado',
    });
    await expect(anular.ejecutar(operador, { ajusteId: 'no-existe', motivo: 'x' })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
    expect(auditoria.entradas).toHaveLength(1);
  });
});
