import { describe, expect, it } from 'vitest';
import { MESES_DE_AUDITORIA } from '../bitacora/aplicacion/casos-uso/depurar-auditoria.js';
import { DESTINO_INSTALACION } from '../configuracion/dominio/destino.js';
import { CLAVES_DE_CORREO, variablesDeCorreo } from './configuracion.js';
import { ParametrosEnConfiguracion } from './infraestructura/parametros-en-configuracion.js';

const variable = (clave: string) => variablesDeCorreo.find((v) => v.clave === clave)!;

describe('variables core.correo.*', () => {
  it('traen los valores del diseño (100 por hora, 500 por día, 20 por destinatario, 1,000 de la instalación, 30 días)', () => {
    expect(variablesDeCorreo.map((v) => [v.clave, v.predeterminado])).toEqual([
      ['core.correo.tope_por_hora_por_cuenta', 100],
      ['core.correo.tope_por_dia_por_cuenta', 500],
      ['core.correo.tope_por_dia_por_destinatario', 20],
      ['core.correo.tope_por_hora_de_la_instalacion', 1000],
      ['core.correo.dias_de_conservacion_del_contenido', 30],
    ]);
  });

  it('son solo de nivel instalación (no hay nivel cuenta ni empresa) y ninguna es pública', () => {
    for (const v of variablesDeCorreo) {
      expect(v.niveles).toEqual(['instalacion']);
      expect(v.publica ?? false).toBe(false);
    }
  });

  it('la conservación del contenido no baja de 7 días ni pasa de 365', () => {
    const { esquema } = variable(CLAVES_DE_CORREO.diasDeConservacionDelContenido);

    expect(esquema.safeParse(6).success).toBe(false);
    expect(esquema.safeParse(7).success).toBe(true);
    expect(esquema.safeParse(366).success).toBe(false);
  });

  it.each([
    [CLAVES_DE_CORREO.topePorHoraPorCuenta, 10_000],
    [CLAVES_DE_CORREO.topePorDiaPorCuenta, 50_000],
    [CLAVES_DE_CORREO.topePorDiaPorDestinatario, 500],
    [CLAVES_DE_CORREO.topePorHoraDeLaInstalacion, 100_000],
  ])('%s admite de 1 a %i, enteros', (clave, maximo) => {
    const { esquema } = variable(clave);

    expect(esquema.safeParse(0).success).toBe(false);
    expect(esquema.safeParse(1).success).toBe(true);
    expect(esquema.safeParse(maximo).success).toBe(true);
    expect(esquema.safeParse(maximo + 1).success).toBe(false);
    expect(esquema.safeParse(1.5).success).toBe(false);
  });
});

describe('ParametrosEnConfiguracion', () => {
  const valores: Record<string, unknown> = {
    [CLAVES_DE_CORREO.topePorHoraPorCuenta]: 11,
    [CLAVES_DE_CORREO.topePorDiaPorCuenta]: 22,
    [CLAVES_DE_CORREO.topePorDiaPorDestinatario]: 33,
    [CLAVES_DE_CORREO.topePorHoraDeLaInstalacion]: 44,
    [CLAVES_DE_CORREO.diasDeConservacionDelContenido]: 55,
    [MESES_DE_AUDITORIA]: 66,
    'core.interfaz.nombre_aplicacion': 'Mi Rancho',
  };
  const consultas: Array<[string, unknown]> = [];
  const lector = {
    obtener: async <Valor>(clave: string, destino: unknown): Promise<Valor> => {
      consultas.push([clave, destino]);
      return valores[clave] as Valor;
    },
  };
  const parametros = new ParametrosEnConfiguracion(lector);

  it('lee los topes, el nombre de la aplicación y la conservación', async () => {
    expect(await parametros.topes()).toEqual({
      porHoraPorCuenta: 11,
      porDiaPorCuenta: 22,
      porDiaPorDestinatario: 33,
      porHoraDeLaInstalacion: 44,
    });
    expect(await parametros.nombreDeLaAplicacion()).toBe('Mi Rancho');
    expect(await parametros.conservacion()).toEqual({ diasDelContenido: 55, mesesDeLosMetadatos: 66 });
  });

  it('siempre pregunta por la instalación, sin cuenta ni empresa', () => {
    expect(consultas.length).toBeGreaterThan(0);
    expect(consultas.every(([, destino]) => destino === DESTINO_INSTALACION)).toBe(true);
  });
});
