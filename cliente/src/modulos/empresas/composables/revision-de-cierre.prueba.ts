import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { CifraDelCuadre, HallazgoDeCierre } from '../servicios/cierre-de-carga.tipos';
import {
  agruparCifras,
  bloquesDeRevision,
  destinoDeRevision,
  esRevision,
  formatearCifra,
  interpretarErrorDelCierre,
  motivoParaEnviar,
  problemaDelMotivo,
  textoDelConteo,
} from './revision-de-cierre';

// Las fechas y los montos dan formato con la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const cifra = (cambios: Partial<CifraDelCuadre> = {}): CifraDelCuadre => ({
  clave: 'total',
  etiqueta: 'Total',
  tipo: 'monto',
  valor: '100.00',
  registro: null,
  ...cambios,
});
const hallazgo = (nivel: HallazgoDeCierre['nivel'], mensaje = 'x'): HallazgoDeCierre => ({
  codigo: 'c',
  nivel,
  mensaje,
  registro: null,
});
const revision = { carga: {}, modulos: [], diferencias: 0, avisos: 0, pideMotivo: false, huella: 'h' };

describe('textoDelConteo', () => {
  it('cuenta diferencias y avisos con su plural', () => {
    expect(textoDelConteo(2, 3)).toBe('2 diferencias y 3 avisos');
    expect(textoDelConteo(1, 0)).toBe('1 diferencia');
    expect(textoDelConteo(0, 1)).toBe('1 aviso');
  });

  it('sin nada dice que no hay observaciones', () => {
    expect(textoDelConteo(0, 0)).toBe('Sin observaciones');
  });
});

describe('formatearCifra', () => {
  it('da formato a los montos y a las cantidades', () => {
    expect(formatearCifra(cifra({ valor: '-120.00' }))).toContain('120.00');
    expect(formatearCifra(cifra({ tipo: 'cantidad', valor: '14' }))).toBe('14');
  });
});

describe('agruparCifras', () => {
  it('pone los totales primero y un grupo por registro', () => {
    const grupos = agruparCifras([
      cifra({ clave: 'a', registro: { id: '1', nombre: 'Cuenta BI' } }),
      cifra({ clave: 'b' }),
      cifra({ clave: 'c', registro: { id: '1', nombre: 'Cuenta BI' } }),
      cifra({ clave: 'd', registro: { id: '2', nombre: 'Cuenta G&T' } }),
    ]);

    expect(grupos.map((g) => g.titulo)).toEqual([null, 'Cuenta BI', 'Cuenta G&T']);
    expect(grupos[1]?.cifras.map((c) => c.clave)).toEqual(['a', 'c']);
  });

  it('sin cifras no hay grupos', () => {
    expect(agruparCifras([])).toEqual([]);
  });
});

describe('bloquesDeRevision', () => {
  it('pone lo que pide motivo antes que los avisos y marca los módulos sin observaciones', () => {
    const [con, sin] = bloquesDeRevision([
      {
        nombreDelModulo: 'Bancos',
        resumen: null,
        ruta: '/bancos/saldos-iniciales',
        hallazgos: [hallazgo('aviso', 'a'), hallazgo('pide_motivo', 'p')],
        cifras: [],
      },
      { nombreDelModulo: 'Libro de compras', resumen: null, ruta: null, hallazgos: [], cifras: [] },
    ]);

    expect(con?.hallazgos.map((h) => h.mensaje)).toEqual(['p', 'a']);
    expect(con?.sinObservaciones).toBe(false);
    expect(sin?.sinObservaciones).toBe(true);
  });
});

describe('problemaDelMotivo', () => {
  it('si lo piden, vacío o solo espacios no vale y dice cuántas diferencias hay', () => {
    expect(problemaDelMotivo('', true, 2)).toContain('2 diferencias');
    expect(problemaDelMotivo('   ', true, 1)).toContain('1 diferencia');
  });

  it('si no lo piden, vacío está bien', () => {
    expect(problemaDelMotivo('', false, 0)).toBeNull();
  });

  it('acepta hasta 500 caracteres y avisa cuántos sobran', () => {
    expect(problemaDelMotivo('a'.repeat(500), true, 1)).toBeNull();
    expect(problemaDelMotivo('a'.repeat(501), false, 0)).toBe('Sobra 1 carácter. Acórtelo a 500 o menos.');
  });
});

describe('motivoParaEnviar', () => {
  it('recorta los espacios y no manda nada si está vacío', () => {
    expect(motivoParaEnviar('  Saldo pendiente de conciliar  ')).toBe('Saldo pendiente de conciliar');
    expect(motivoParaEnviar('   ')).toBeUndefined();
  });
});

describe('interpretarErrorDelCierre', () => {
  const error = (codigo: string, detalles?: unknown) => new ErrorApi(422, { codigo, mensaje: 'Mensaje', detalles });

  it('la revisión desactualizada trae la revisión nueva', () => {
    const resultado = interpretarErrorDelCierre(error('revision_de_cierre_desactualizada', revision));
    expect(resultado).toEqual({ tipo: 'desactualizada', revision });
  });

  it('el motivo requerido o inválido va al campo del motivo', () => {
    expect(interpretarErrorDelCierre(error('motivo_de_cierre_requerido', revision))).toMatchObject({
      tipo: 'motivo',
      mensaje: 'Mensaje',
    });
    expect(interpretarErrorDelCierre(error('motivo_de_cierre_invalido'))).toMatchObject({
      tipo: 'motivo',
      revision: null,
    });
  });

  it('cualquier otro error es de otro tipo', () => {
    expect(interpretarErrorDelCierre(error('carga_inicial_cerrada'))).toEqual({ tipo: 'otro' });
    expect(interpretarErrorDelCierre(new Error('x'))).toEqual({ tipo: 'otro' });
  });
});

describe('esRevision', () => {
  it('distingue una revisión de una lista de errores por campo', () => {
    expect(esRevision(revision)).toBe(true);
    expect(esRevision([{ campo: 'motivo', mensaje: 'x' }])).toBe(false);
    expect(esRevision(null)).toBe(false);
  });
});

describe('destinoDeRevision', () => {
  const resolver = (ruta: string) =>
    ruta === '/bancos/saldos-iniciales'
      ? { matched: [{}], meta: { permiso: 'bancos.saldos-iniciales.ver' } }
      : { matched: [], meta: {} };

  it('lleva a la pantalla solo si existe y el usuario tiene su permiso', () => {
    expect(destinoDeRevision('/bancos/saldos-iniciales', resolver, () => true)).toBe('/bancos/saldos-iniciales');
    expect(destinoDeRevision('/bancos/saldos-iniciales', resolver, () => false)).toBeNull();
    expect(destinoDeRevision('/no-existe', resolver, () => true)).toBeNull();
    expect(destinoDeRevision(null, resolver, () => true)).toBeNull();
  });
});
