import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import type { CifrasParaLaDeclaracion } from '../modulos/core/contratos/libro-de-compras.contratos.js';
import { aCentavos, deCentavos } from '../modulos/core/compartido/dominio/centavos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  instalarDestinoFalso,
  prepararEscenario,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { declarar, detalleDe, mesDe, registrarEn } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const ANTERIOR = mesDe(-3);
const SIGUIENTE = mesDe(-2);
const RUTA_SAT = '/api/libro-de-compras/libro/sat-2237';
const RESPUESTAS = new Map<string, Record<string, string>>();
let escenario: EscenarioDeDocumentos;
let pequeno: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;

/** Lo que responde el módulo de ventas de cada período (por la clave de la cifra). */
function responder(periodo: string, cifras: Record<string, string>): void {
  RESPUESTAS.set(periodo, cifras);
}

const respuestaDe = (periodo: string): CifrasParaLaDeclaracion | null => {
  const cifras = RESPUESTAS.get(periodo);
  if (!cifras) return null;
  return {
    modulo: 'terceros',
    clave: 'ventas',
    cifras: Object.entries(cifras).map(([clave, valor]) => ({ clave, etiqueta: clave, tipo: 'monto', valor })),
  };
};

const creditoDe = (declarada: { cuerpo: any }): number =>
  aCentavos(declarada.cuerpo.declaracion.foto.resumen.creditoFiscalDelPeriodo);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'remanentes');
  pequeno = await prepararEscenario(entorno, 'remapequeno');
  await configurarEmpresa(pequeno.cuenta, { regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'ninguno' });
  await registrarEn(escenario, ANTERIOR);
  await registrarEn(escenario, SIGUIENTE);
  await registrarEn(pequeno, ANTERIOR);
  mediador.responder('terceros', 'libro-de-compras.cifras_para_la_declaracion', async ({ periodo }) =>
    respuestaDe(periodo),
  );
});

afterAll(() => vi.restoreAllMocks());

describe('remanente de retenciones en varios meses seguidos (SAT-2237)', () => {
  it('el primer mes usa el remanente que escribe el usuario y deja el suyo para el siguiente', async () => {
    responder(ANTERIOR, { debito: '0.00', retenciones_de_iva: '100.00' });

    const declarada = await declarar(propietario(), ANTERIOR, { remanenteDeRetencionesAnterior: '25.00' });

    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    expect(declarada.cuerpo.declaracion.foto.remanentes).toEqual({
      formulario: 'SAT-2237',
      retencionesDelPeriodo: '100.00',
      remanenteAnterior: '25.00',
      creditoAnterior: '0.00',
      impuestoDelMes: '0.00',
      creditoAlSiguiente: deCentavos(creditoDe(declarada)),
      impuestoAPagar: '0.00',
      remanenteAlSiguiente: '125.00',
      supuestos: { credito: true },
    });
  });

  it('el mes siguiente toma el remanente de la foto del anterior y no lo que se escriba', async () => {
    const credito = creditoDe(await declarar(propietario(), ANTERIOR, { remanenteDeRetencionesAnterior: '25.00' }));
    responder(SIGUIENTE, { debito: '1000.00', retenciones_de_iva: '10.00' });

    const declarada = await declarar(propietario(), SIGUIENTE, { remanenteDeRetencionesAnterior: '999.00' });

    const impuesto = 100000 - creditoDe(declarada) - credito;
    expect(credito).toBeGreaterThan(0);
    expect(declarada.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '125.00',
      creditoAnterior: deCentavos(credito),
      impuestoDelMes: deCentavos(impuesto),
      impuestoAPagar: deCentavos(Math.max(0, impuesto - 13500)),
      remanenteAlSiguiente: deCentavos(Math.max(0, 13500 - impuesto)),
    });
  });

  it('rectificar el primer mes sin escribir el remanente conserva el que ya tenía', async () => {
    responder(ANTERIOR, { debito: '0.00', retenciones_de_iva: '150.00' });

    const rectificada = await declarar(propietario(), ANTERIOR);

    expect(rectificada.cuerpo.declaracion.evento).toBe('rectificacion');
    expect(rectificada.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '25.00',
      remanenteAlSiguiente: '175.00',
    });
    const cambios: Array<{ clave: string; cambio: string }> = rectificada.cuerpo.declaracion.diferencia.cambios;
    expect(cambios.find((c) => c.clave === 'remanentes.remanenteAlSiguiente')?.cambio).toBe('50.00');
  });

  it('el detalle del mes siguiente avisa que cambió el remanente del anterior cuando se rectifica ese mes', async () => {
    const { cambioDesdeLaDeclaracion: cambio } = await detalleDe(propietario(), SIGUIENTE);

    const remanentes = cambio.cambios.filter((c: { clave: string }) => c.clave.startsWith('remanentes.'));
    expect(remanentes).toContainEqual({
      clave: 'remanentes.remanenteAnterior',
      anterior: '125.00',
      actual: '175.00',
      cambio: '50.00',
    });
  });

  it('al rectificar también el mes siguiente, el aviso desaparece', async () => {
    const rectificada = await declarar(propietario(), SIGUIENTE);

    expect(rectificada.cuerpo.declaracion.foto.remanentes.remanenteAnterior).toBe('175.00');
    const { cambioDesdeLaDeclaracion: cambio } = await detalleDe(propietario(), SIGUIENTE);
    expect(cambio.cambios.filter((c: { clave: string }) => c.clave.startsWith('remanentes.'))).toEqual([]);
  });

  it('el remanente escrito se valida como monto en quetzales', async () => {
    const rechazada = await declarar(propietario(), ANTERIOR, { remanenteDeRetencionesAnterior: '-5' });

    expect(rechazada.estado).toBe(400);
  });
});

describe('datos para el SAT-2237 con ventas', () => {
  it('muestra las cifras de ventas y el remanente que dejaría hoy', async () => {
    const { estado, cuerpo } = await propietario().get(`${RUTA_SAT}?periodo=${SIGUIENTE.slice(0, 7)}`);

    expect(estado, JSON.stringify(cuerpo)).toBe(200);
    expect(cuerpo.ventas).toEqual([respuestaDe(SIGUIENTE)]);
    expect(cuerpo.remanentes).toMatchObject({ formulario: 'SAT-2237', remanenteAnterior: '175.00' });
  });

  it('sin módulo de ventas que responda, no hay sección de ventas', async () => {
    RESPUESTAS.delete(SIGUIENTE);

    const { cuerpo } = await propietario().get(`${RUTA_SAT}?periodo=${SIGUIENTE.slice(0, 7)}`);

    expect(cuerpo.ventas).toEqual([]);
    expect(cuerpo.remanentes).toBeNull();
  });
});

describe('saldos escritos sin respuesta de ventas', () => {
  const SIN_VENTAS = mesDe(-6);

  it('se guardan en la foto aunque ningún módulo de ventas responda', async () => {
    const declarada = await declarar(propietario(), SIN_VENTAS, {
      remanenteDeRetencionesAnterior: '10.00',
      remanenteDeCreditoAnterior: '4.00',
    });

    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    const foto = declarada.cuerpo.declaracion.foto;
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales).toEqual({ formulario: 'SAT-2237', retenciones: '10.00', credito: '4.00' });
  });

  it('una rectificación con ventas ya los usa sin volver a escribirlos', async () => {
    responder(SIN_VENTAS, { debito: '0.00', retenciones_de_iva: '0.00' });

    const rectificada = await declarar(propietario(), SIN_VENTAS);

    expect(rectificada.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '10.00',
      creditoAnterior: '4.00',
      remanenteAlSiguiente: '10.00',
      creditoAlSiguiente: '4.00',
    });
  });

  it('rectificar escribiendo solo uno de los saldos conserva el otro', async () => {
    const rectificada = await declarar(propietario(), SIN_VENTAS, { remanenteDeRetencionesAnterior: '12.00' });

    expect(rectificada.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '12.00',
      creditoAnterior: '4.00',
    });
  });
});

describe('varios meses seguidos sin módulo de ventas', () => {
  it('no avisa de saldo faltante en ningún mes: sin ventas no hay cierre que calcular', async () => {
    for (const desplazamiento of [-12, -11, -10, -9]) {
      const declarada = await declarar(propietario(), mesDe(desplazamiento));

      expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
      expect(declarada.cuerpo.avisos.filter((aviso: string) => aviso.includes('saldo'))).toEqual([]);
      expect(declarada.cuerpo.declaracion.foto.saldosIniciales?.aviso).toBeUndefined();
    }
  });
});

describe('pequeño contribuyente electrónico (régimen derogado)', () => {
  it('no lleva cálculo de remanente ni en la pantalla ni en la declaración', async () => {
    const historico = await prepararEscenario(entorno, 'remaelectronico');
    await configurarEmpresa(historico.cuenta, {
      regimenIva: 'pequeno_contribuyente_electronico',
      agenteDeRetencionIva: 'ninguno',
    });
    await registrarEn(historico, ANTERIOR);
    responder(ANTERIOR, { ingresos: '1000.00', retenciones_de_iva: '80.00' });

    const pantalla = await historico.cuenta.propietario.get(`${RUTA_SAT}?periodo=${ANTERIOR.slice(0, 7)}`);
    const declarada = await declarar(historico.cuenta.propietario, ANTERIOR);

    expect(pantalla.cuerpo.remanentes).toBeNull();
    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    expect(declarada.cuerpo.declaracion.foto.remanentes).toBeUndefined();
  });
});

describe('saldo de constancias del SAT-2046', () => {
  it('la declaración guarda el 5 % de los ingresos, las constancias y el saldo', async () => {
    responder(ANTERIOR, { ingresos: '1000.00', retenciones_de_iva: '80.00' });

    const declarada = await declarar(pequeno.cuenta.propietario, ANTERIOR, { formulario: 'SAT-2046' });

    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    expect(declarada.cuerpo.declaracion.foto.remanentes).toEqual({
      formulario: 'SAT-2046',
      retencionesDelPeriodo: '80.00',
      remanenteAnterior: '0.00',
      creditoAnterior: '0.00',
      impuestoDelMes: '50.00',
      creditoAlSiguiente: '0.00',
      impuestoAPagar: '0.00',
      remanenteAlSiguiente: '30.00',
      supuestos: { retenciones: true },
    });
  });

  it('la pantalla del SAT-2046 muestra las constancias aunque el régimen no declare compras', async () => {
    const { cuerpo } = await pequeno.cuenta.propietario.get(`${RUTA_SAT}?periodo=${ANTERIOR.slice(0, 7)}`);

    expect(cuerpo.aplica).toBe(false);
    expect(cuerpo.formulario).toBe('SAT-2046');
    expect(cuerpo.remanentes).toMatchObject({ formulario: 'SAT-2046', remanenteAlSiguiente: '30.00' });
  });
});
