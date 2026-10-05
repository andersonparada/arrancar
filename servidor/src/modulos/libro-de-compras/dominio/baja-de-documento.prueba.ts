import { describe, expect, it } from 'vitest';
import {
  accionesDeDocumento,
  exigirAnulable,
  exigirEliminable,
  motivoDeAnulacionValido,
  type HechosDeUnDocumento,
} from './baja-de-documento.js';
import {
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoProcesadoEnElDestino,
  DocumentoYaAnulado,
  MotivoDeAnulacionInvalido,
} from './errores-de-baja.js';

const limpio: HechosDeUnDocumento = {
  anulado: false,
  procesadoEnElDestino: false,
  notasVigentes: 0,
  notasEnTotal: 0,
};
const con = (cambios: Partial<HechosDeUnDocumento>): HechosDeUnDocumento => ({ ...limpio, ...cambios });

describe('acciones posibles de un documento', () => {
  it('uno limpio se anula y se elimina', () => {
    expect(accionesDeDocumento(limpio)).toEqual({ puedeAnular: true, puedeEliminar: true });
  });

  it('procesado en el destino se anula pero no se elimina', () => {
    expect(accionesDeDocumento(con({ procesadoEnElDestino: true }))).toEqual({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('con una nota vigente no se anula ni se elimina', () => {
    expect(accionesDeDocumento(con({ notasVigentes: 1, notasEnTotal: 1 }))).toEqual({
      puedeAnular: false,
      puedeEliminar: false,
    });
  });

  it('con solo notas anuladas se anula, pero no se elimina: las notas siguen apuntando a la factura', () => {
    expect(accionesDeDocumento(con({ notasVigentes: 0, notasEnTotal: 2 }))).toEqual({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('uno anulado ya no ofrece nada', () => {
    expect(accionesDeDocumento(con({ anulado: true }))).toEqual({ puedeAnular: false, puedeEliminar: false });
  });
});

describe('exigir que se pueda anular o eliminar', () => {
  it('anular rechaza lo anulado y lo que tiene notas vigentes', () => {
    expect(() => exigirAnulable(limpio)).not.toThrow();
    expect(() => exigirAnulable(con({ anulado: true }))).toThrow(DocumentoYaAnulado);
    expect(() => exigirAnulable(con({ notasVigentes: 1, notasEnTotal: 1 }))).toThrow(DocumentoConNotasVigentes);
  });

  it('eliminar rechaza lo anulado, lo procesado y lo que tiene notas', () => {
    expect(() => exigirEliminable(limpio)).not.toThrow();
    expect(() => exigirEliminable(con({ anulado: true }))).toThrow(DocumentoYaAnulado);
    expect(() => exigirEliminable(con({ procesadoEnElDestino: true }))).toThrow(DocumentoProcesadoEnElDestino);
    expect(() => exigirEliminable(con({ notasEnTotal: 1 }))).toThrow(DocumentoConNotas);
  });
});

describe('motivo de la anulación', () => {
  it('se limpia de espacios y acepta de 1 a 300 caracteres', () => {
    expect(motivoDeAnulacionValido('  Duplicada  ')).toBe('Duplicada');
    expect(motivoDeAnulacionValido('a'.repeat(300))).toHaveLength(300);
  });

  it('vacío o de más de 300 caracteres se rechaza', () => {
    expect(() => motivoDeAnulacionValido('   ')).toThrow(MotivoDeAnulacionInvalido);
    expect(() => motivoDeAnulacionValido('a'.repeat(301))).toThrow(MotivoDeAnulacionInvalido);
  });
});
