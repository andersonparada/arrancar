import { describe, expect, it } from 'vitest';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from './documento-por-pagar.js';
import {
  noEstarAutorizado,
  noTenerNotasAplicadas,
  REGLAS_PARA_ANULAR,
  REGLAS_PARA_ELIMINAR,
} from './reglas-de-baja.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
  id: 'doc',
  documentoId: 'libro',
  tipo: 'factura',
  proveedorId: 'proveedor',
  documentoAfectadoId: null,
  fechaEmision: '2026-03-10',
  totalCentavos: 11200,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
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
): DocumentoConAplicaciones => ({ documento: documento(cambios), hechas: [], recibidas });
const aplicacion = { notaId: 'nota', cargoId: 'doc', montoCentavos: 100 };

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

  it('anular se puede aun autorizado; eliminar no', () => {
    const autorizado = guardado({ estado: 'autorizado' });

    expect(() => REGLAS_PARA_ANULAR.forEach((regla) => regla(autorizado))).not.toThrow();
    expect(() => REGLAS_PARA_ELIMINAR.forEach((regla) => regla(autorizado))).toThrow();
  });
});
