import { describe, expect, it } from 'vitest';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from './documento-por-pagar.js';
import {
  noEstarAutorizado,
  noTenerAjustesVigentes,
  noTenerAplicacionesManualesRecibidas,
  noTenerNotasAplicadas,
  REGLAS_PARA_ANULAR,
  REGLAS_PARA_ELIMINAR,
} from './reglas-de-baja.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
  id: 'doc',
  origen: 'libro_de_compras',
  documentoId: 'libro',
  serie: 'A',
  numero: '100',
  tipo: 'factura',
  proveedorId: 'proveedor',
  documentoAfectadoId: null,
  fechaEmision: '2026-03-10',
  totalCentavos: 11200,
  retencionesCentavos: 0,
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
  ingresadoPor: null,
  estado: 'pendiente',
  registradoEn: null,
  registradoPor: null,
  autorizadoEn: null,
  autorizadoPor: null,
  autorizacionPropia: false,
  ...cambios,
});
const guardado = (
  cambios: Partial<DocumentoPorPagar> = {},
  recibidas: DocumentoConAplicaciones['recibidas'] = [],
  ajustes: DocumentoConAplicaciones['ajustes'] = [],
): DocumentoConAplicaciones => ({ documento: documento(cambios), hechas: [], recibidas, ajustes });
const aplicacion = {
  id: 'a1',
  notaId: 'nota',
  cargoId: 'doc',
  montoCentavos: 100,
  forma: 'automatica' as const,
  fecha: '2026-03-10',
  referencia: null,
  otraSerie: 'N',
  otroNumero: '7',
};

describe('reglas de baja', () => {
  describe('no estar autorizado (para eliminar)', () => {
    it('rechaza un documento autorizado', () => {
      expect(() => noEstarAutorizado(guardado({ estado: 'autorizado' }))).toThrow(
        expect.objectContaining({ codigo: 'documento_autorizado' }),
      );
    });

    it('deja pasar el pendiente y el registrado', () => {
      expect(() => noEstarAutorizado(guardado({ estado: 'pendiente' }))).not.toThrow();
      expect(() => noEstarAutorizado(guardado({ estado: 'registrado' }))).not.toThrow();
    });
  });

  describe('no tener notas de crédito aplicadas', () => {
    it('rechaza una factura con notas aplicadas', () => {
      expect(() => noTenerNotasAplicadas(guardado({}, [aplicacion]))).toThrow(
        expect.objectContaining({ codigo: 'cargo_con_notas_aplicadas' }),
      );
    });

    it('rechaza cualquier cargo que no sea nota de débito, como el recibo y la factura especial', () => {
      expect(() => noTenerNotasAplicadas(guardado({ tipo: 'recibo' }, [aplicacion]))).toThrow();
      expect(() => noTenerNotasAplicadas(guardado({ tipo: 'factura_especial' }, [aplicacion]))).toThrow();
    });

    it('deja pasar una factura sin notas, una nota de débito con notas aplicadas y una nota de crédito', () => {
      expect(() => noTenerNotasAplicadas(guardado())).not.toThrow();
      expect(() => noTenerNotasAplicadas(guardado({ tipo: 'nota_de_debito' }, [aplicacion]))).not.toThrow();
      expect(() => noTenerNotasAplicadas(guardado({ tipo: 'nota_de_credito' }))).not.toThrow();
    });
  });

  describe('no tener aplicaciones manuales recibidas', () => {
    const manual = (otroNumero: string, id = otroNumero) => ({
      ...aplicacion,
      id,
      forma: 'manual' as const,
      otroNumero,
    });

    it('rechaza una factura o una nota de débito y nombra la nota', () => {
      const regla = noTenerAplicacionesManualesRecibidas;

      expect(() => regla(guardado({}, [manual('7')]))).toThrow(
        expect.objectContaining({ codigo: 'cargo_con_aplicaciones_manuales' }),
      );
      expect(() => regla(guardado({ tipo: 'nota_de_debito' }, [manual('7')]))).toThrow('la nota N-7');
    });

    it('nombra todas las notas, sin repetir, cuando son varias', () => {
      const recibidas = [manual('7', 'a'), manual('8', 'b'), manual('7', 'c')];

      expect(() => noTenerAplicacionesManualesRecibidas(guardado({}, recibidas))).toThrow('las notas N-7 y N-8');
    });

    it('deja pasar un cargo con solo aplicaciones automáticas o sin ninguna', () => {
      expect(() => noTenerAplicacionesManualesRecibidas(guardado({}, [aplicacion]))).not.toThrow();
      expect(() => noTenerAplicacionesManualesRecibidas(guardado())).not.toThrow();
    });
  });

  describe('no tener ajustes vigentes', () => {
    const ajuste = (estado: 'vigente' | 'anulado') => ({
      id: 'x',
      documentoId: 'doc',
      montoCentavos: 100,
      fecha: '2026-03-10',
      causa: 'no_recuperable' as const,
      motivo: 'm',
      referencia: null,
      estado,
      motivoDeAnulacion: estado === 'anulado' ? 'm' : null,
    });

    it('rechaza una nota con un ajuste vigente', () => {
      const nota = guardado({ tipo: 'nota_de_credito' }, [], [ajuste('vigente')]);

      expect(() => noTenerAjustesVigentes(nota)).toThrow(expect.objectContaining({ codigo: 'nota_con_ajustes' }));
    });

    it('deja pasar una nota sin ajustes o con ajustes solo anulados', () => {
      expect(() => noTenerAjustesVigentes(guardado({ tipo: 'nota_de_credito' }))).not.toThrow();
      expect(() =>
        noTenerAjustesVigentes(guardado({ tipo: 'nota_de_credito' }, [], [ajuste('anulado')])),
      ).not.toThrow();
    });
  });

  it('las listas de anular y eliminar llevan las reglas nuevas antes de las notas aplicadas', () => {
    expect(REGLAS_PARA_ANULAR).toEqual([
      noTenerAplicacionesManualesRecibidas,
      noTenerAjustesVigentes,
      noTenerNotasAplicadas,
    ]);
    expect(REGLAS_PARA_ELIMINAR).toEqual([
      noEstarAutorizado,
      noTenerAplicacionesManualesRecibidas,
      noTenerAjustesVigentes,
      noTenerNotasAplicadas,
    ]);
  });

  it('anular se puede aun autorizado; eliminar no', () => {
    const autorizado = guardado({ estado: 'autorizado' });

    expect(() => REGLAS_PARA_ANULAR.forEach((regla) => regla(autorizado))).not.toThrow();
    expect(() => REGLAS_PARA_ELIMINAR.forEach((regla) => regla(autorizado))).toThrow();
  });
});
