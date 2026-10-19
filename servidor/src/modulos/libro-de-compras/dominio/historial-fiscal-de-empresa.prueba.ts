import { describe, expect, it } from 'vitest';
import { DatosFiscalesDeEmpresa, type PropiedadesFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesInvalidos } from './errores.js';
import {
  HistorialFiscalDeEmpresa,
  primerPeriodoEnRangos,
  VigenciaBaseNoSeQuita,
  type VigenciaFiscal,
} from './historial-fiscal-de-empresa.js';

const datos = (cambios: Partial<PropiedadesFiscalesDeEmpresa> = {}) =>
  DatosFiscalesDeEmpresa.crear({ ...DatosFiscalesDeEmpresa.porOmision().instantanea(), ...cambios });

/** Con crédito (régimen general). */
const general = datos();
/** Sin crédito: pequeño contribuyente. */
const pequeno = datos({ regimenIva: 'pequeno_contribuyente', regimenIsr: null, esAgenteDeRetencionIsr: true });
/** Otro régimen distinto de los dos. */
const noAfiliado = datos({ regimenIva: 'no_afiliado', regimenIsr: 'exento' });

const vigencia = (id: string, vigenteDesde: string | null, de: DatosFiscalesDeEmpresa): VigenciaFiscal => ({
  id,
  vigenteDesde,
  datos: de,
});

const soloBase = () => new HistorialFiscalDeEmpresa([vigencia('base', null, general)]);
const baseYNoviembre = () =>
  new HistorialFiscalDeEmpresa([vigencia('base', null, general), vigencia('nov', '2026-11-01', pequeno)]);

const regimenes = (historial: HistorialFiscalDeEmpresa) =>
  historial.vigencias().map((v) => [v.vigenteDesde, v.datos.instantanea().regimenIva]);

describe('HistorialFiscalDeEmpresa: la vigencia de un período', () => {
  it('sin vigencias no hay datos de ningún período', () => {
    expect(new HistorialFiscalDeEmpresa().vigenteEn('2026-10-01')).toBeNull();
  });

  it('solo con la base, vale para cualquier período, también uno muy anterior', () => {
    expect(soloBase().vigenteEn('1990-01-01')?.id).toBe('base');
    expect(soloBase().vigenteEn('2035-12-01')?.id).toBe('base');
  });

  it('con base y noviembre: octubre es de la base; noviembre y diciembre, de noviembre', () => {
    const historial = baseYNoviembre();

    expect(historial.vigenteEn('2026-10-01')?.id).toBe('base');
    expect(historial.vigenteEn('2026-11-01')?.id).toBe('nov');
    expect(historial.vigenteEn('2026-12-01')?.id).toBe('nov');
  });

  it('un cambio programado a futuro no rige todavía', () => {
    const programado = new HistorialFiscalDeEmpresa([
      vigencia('base', null, general),
      vigencia('feb', '2027-02-01', pequeno),
    ]);

    expect(programado.vigenteEn('2026-10-05')?.id).toBe('base');
  });

  it('calcula el último mes de cada vigencia: el mes anterior al de la siguiente', () => {
    const historial = baseYNoviembre();
    const [base, noviembre] = historial.vigencias() as [VigenciaFiscal, VigenciaFiscal];

    expect(historial.vigenteHasta(base)).toBe('2026-10-01');
    expect(historial.vigenteHasta(noviembre)).toBeNull();
  });

  it('ordena las vigencias con la base primero', () => {
    const historial = new HistorialFiscalDeEmpresa([
      vigencia('nov', '2026-11-01', pequeno),
      vigencia('base', null, general),
    ]);

    expect(historial.vigencias().map((v) => v.id)).toEqual(['base', 'nov']);
  });
});

describe('HistorialFiscalDeEmpresa.aplicar', () => {
  it('caso 1, sin historial: crea la base, sea cual sea la fecha', () => {
    const creado = new HistorialFiscalDeEmpresa().aplicar({ vigenteDesde: '2026-03-01', datos: general });

    expect(creado.vigencias()).toEqual([{ id: null, vigenteDesde: null, datos: general }]);
  });

  it('caso 2, mismos datos que rigen: no cambia nada', () => {
    const historial = baseYNoviembre();

    expect(historial.aplicar({ vigenteDesde: '2026-12-01', datos: pequeno }).esIgualA(historial)).toBe(true);
    expect(historial.aplicar({ vigenteDesde: '2026-11-01', datos: pequeno }).esIgualA(historial)).toBe(true);
    expect(soloBase().aplicar({ vigenteDesde: null, datos: general }).esIgualA(soloBase())).toBe(true);
  });

  it('caso 3, la fecha es la de una vigencia y los datos cambian: la corrige', () => {
    const corregido = baseYNoviembre().aplicar({ vigenteDesde: '2026-11-01', datos: noAfiliado });

    expect(regimenes(corregido)).toEqual([
      [null, 'general'],
      ['2026-11-01', 'no_afiliado'],
    ]);
    expect(corregido.buscar('nov')?.datos.esIgualA(noAfiliado)).toBe(true);
  });

  it('caso 3, corregir la base («desde el inicio»)', () => {
    const corregido = soloBase().aplicar({ vigenteDesde: null, datos: pequeno });

    expect(regimenes(corregido)).toEqual([[null, 'pequeno_contribuyente']]);
    expect(corregido.buscar('base')).toBeDefined();
  });

  it('caso 4, la fecha cae dentro de un escalón y los datos cambian: parte el escalón desde ese mes', () => {
    const partido = soloBase().aplicar({ vigenteDesde: '2026-11-01', datos: pequeno });

    expect(regimenes(partido)).toEqual([
      [null, 'general'],
      ['2026-11-01', 'pequeno_contribuyente'],
    ]);
    expect(partido.vigencias()[1]?.id).toBeNull();
  });

  it('caso 5, el escalón nuevo igual al que lo precede no se crea', () => {
    const historial = baseYNoviembre().aplicar({ vigenteDesde: '2027-02-01', datos: pequeno });

    expect(historial.vigencias()).toHaveLength(2);
  });

  it('caso 5, una corrección que deja dos escalones iguales los junta', () => {
    const corregido = baseYNoviembre().aplicar({ vigenteDesde: '2026-11-01', datos: general });

    expect(regimenes(corregido)).toEqual([[null, 'general']]);
    expect(corregido.diferenciasCon(corregido).eliminar).toEqual([]);
    expect(baseYNoviembre().diferenciasCon(corregido).eliminar).toEqual(['nov']);
  });

  it('un escalón nuevo igual al que le sigue lo adelanta: el siguiente sobra', () => {
    const programado = new HistorialFiscalDeEmpresa([
      vigencia('base', null, general),
      vigencia('dic', '2026-12-01', pequeno),
    ]);

    const adelantado = programado.aplicar({ vigenteDesde: '2026-11-01', datos: pequeno });

    expect(regimenes(adelantado)).toEqual([
      [null, 'general'],
      ['2026-11-01', 'pequeno_contribuyente'],
    ]);
    expect(programado.diferenciasCon(adelantado)).toMatchObject({ eliminar: ['dic'], actualizar: [] });
  });

  it('caso 6, solo cambia el tipo de persona: lo cambia en todas las vigencias', () => {
    const individual = datos({ tipoDePersona: 'individual' });
    const historial = soloBase().aplicar({ vigenteDesde: null, datos: individual });
    const dosVigencias = baseYNoviembre().aplicar({
      vigenteDesde: '2026-12-01',
      datos: datos({ ...pequeno.instantanea(), tipoDePersona: 'individual' }),
    });

    expect(historial.vigencias()[0]?.datos.instantanea().tipoDePersona).toBe('individual');
    expect(dosVigencias.vigencias().map((v) => v.datos.instantanea().tipoDePersona)).toEqual([
      'individual',
      'individual',
    ]);
    expect(dosVigencias.vigencias()).toHaveLength(2);
  });

  it('cambiar el tipo de persona a uno que contradice otra vigencia se rechaza', () => {
    const historial = new HistorialFiscalDeEmpresa([
      vigencia('base', null, general),
      vigencia('nov', '2026-11-01', noAfiliado),
    ]);

    const cambio = () => historial.aplicar({ vigenteDesde: null, datos: datos({ tipoDePersona: 'individual' }) });

    expect(cambio).toThrow(DatosFiscalesInvalidos);
  });

  it('corregir la única vigencia permite cambiar a la vez el tipo de persona y el régimen', () => {
    const conExenta = new HistorialFiscalDeEmpresa([vigencia('base', null, noAfiliado)]);

    const corregido = conExenta.aplicar({ vigenteDesde: null, datos: datos({ tipoDePersona: 'individual' }) });

    expect(corregido.vigencias()[0]?.datos.instantanea()).toMatchObject({
      tipoDePersona: 'individual',
      regimenIva: 'general',
    });
  });

  it('el régimen agropecuario no puede iniciar desde su derogación, pero sí antes', () => {
    const agropecuario = datos({
      tipoDePersona: 'individual',
      regimenIva: 'contribuyente_agropecuario',
      regimenIsr: null,
      esAgenteDeRetencionIsr: false,
    });
    const historial = new HistorialFiscalDeEmpresa([vigencia('base', null, datos({ tipoDePersona: 'individual' }))]);

    expect(() => historial.aplicar({ vigenteDesde: '2025-07-01', datos: agropecuario })).toThrow(
      DatosFiscalesInvalidos,
    );
    expect(() => new HistorialFiscalDeEmpresa().aplicar({ vigenteDesde: '2026-01-01', datos: agropecuario })).toThrow(
      DatosFiscalesInvalidos,
    );
    expect(regimenes(historial.aplicar({ vigenteDesde: '2025-06-01', datos: agropecuario }))[1]).toEqual([
      '2025-06-01',
      'contribuyente_agropecuario',
    ]);
  });
});

describe('HistorialFiscalDeEmpresa.quitar', () => {
  it('quita una vigencia: su escalón pasa a la anterior', () => {
    const sin = baseYNoviembre().quitar('nov');

    expect(regimenes(sin)).toEqual([[null, 'general']]);
    expect(sin.vigenteEn('2026-12-01')?.id).toBe('base');
  });

  it('la base no se quita', () => {
    expect(() => baseYNoviembre().quitar('base')).toThrow(VigenciaBaseNoSeQuita);
  });

  it('si quedan dos escalones iguales seguidos, se juntan', () => {
    const historial = new HistorialFiscalDeEmpresa([
      vigencia('base', null, general),
      vigencia('nov', '2026-11-01', pequeno),
      vigencia('feb', '2027-02-01', general),
    ]);

    expect(regimenes(historial.quitar('nov'))).toEqual([[null, 'general']]);
  });
});

describe('HistorialFiscalDeEmpresa.rangosAfectados', () => {
  it('corregir la base cambia todos los períodos hasta la siguiente vigencia', () => {
    const antes = baseYNoviembre();
    const despues = antes.aplicar({ vigenteDesde: null, datos: noAfiliado });

    expect(antes.rangosAfectados(despues)).toEqual([{ desde: null, hasta: '2026-10-01' }]);
  });

  it('un cambio a partir de un mes afecta desde ese mes, sin límite', () => {
    const antes = soloBase();
    const despues = antes.aplicar({ vigenteDesde: '2026-11-01', datos: pequeno });

    expect(antes.rangosAfectados(despues)).toEqual([{ desde: '2026-11-01', hasta: null }]);
  });

  it('partir un escalón con los mismos datos no afecta ningún período', () => {
    const antes = soloBase();

    expect(antes.rangosAfectados(antes.aplicar({ vigenteDesde: '2026-11-01', datos: general }))).toEqual([]);
  });

  it('el tipo de persona no cuenta', () => {
    const antes = soloBase();
    const despues = antes.aplicar({ vigenteDesde: null, datos: datos({ tipoDePersona: 'individual' }) });

    expect(antes.rangosAfectados(despues)).toEqual([]);
  });

  it('quitar una vigencia afecta los meses de su escalón', () => {
    const antes = new HistorialFiscalDeEmpresa([
      vigencia('base', null, general),
      vigencia('nov', '2026-11-01', pequeno),
      vigencia('feb', '2027-02-01', noAfiliado),
    ]);

    expect(antes.rangosAfectados(antes.quitar('nov'))).toEqual([{ desde: '2026-11-01', hasta: '2027-01-01' }]);
  });

  it('une los tramos seguidos que cambian', () => {
    const antes = new HistorialFiscalDeEmpresa([
      vigencia('base', null, general),
      vigencia('nov', '2026-11-01', pequeno),
      vigencia('feb', '2027-02-01', noAfiliado),
    ]);
    const despues = new HistorialFiscalDeEmpresa([vigencia('base', null, noAfiliado)]);

    expect(antes.rangosAfectados(despues)).toEqual([{ desde: null, hasta: '2027-01-01' }]);
  });
});

describe('HistorialFiscalDeEmpresa.diferenciasCon', () => {
  it('lleva a lo guardado lo que sobra, lo que cambió y lo nuevo', () => {
    const antes = baseYNoviembre();
    const despues = antes
      .aplicar({ vigenteDesde: null, datos: noAfiliado })
      .aplicar({ vigenteDesde: '2027-03-01', datos: general });

    const { eliminar, actualizar, insertar } = antes.diferenciasCon(despues);

    expect(eliminar).toEqual([]);
    expect(actualizar.map((v) => v.id)).toEqual(['base']);
    expect(insertar.map((v) => v.vigenteDesde)).toEqual(['2027-03-01']);
  });
});

describe('primerPeriodoEnRangos', () => {
  const rangos = [{ desde: '2026-11-01', hasta: '2027-01-01' }];

  it('devuelve el primer período con documentos dentro de los rangos', () => {
    expect(primerPeriodoEnRangos(['2026-10-01', '2026-12-01', '2027-01-01'], rangos)).toBe('2026-12-01');
  });

  it('devuelve nada si ningún período cae dentro', () => {
    expect(primerPeriodoEnRangos(['2026-10-01', '2027-02-01'], rangos)).toBeUndefined();
  });

  it('un rango sin límites abarca todo', () => {
    expect(primerPeriodoEnRangos(['2019-05-01'], [{ desde: null, hasta: null }])).toBe('2019-05-01');
  });
});
