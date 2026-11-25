import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import type { CifrasParaLaDeclaracion } from '../modulos/core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  instalarDestinoFalso,
  prepararEscenario,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { declarar, detalleDe, mesDe } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const RUTA_SAT = '/api/libro-de-compras/libro/sat-2237';
const RESPUESTAS = new Map<string, Record<string, string>>();
let escenario: EscenarioDeDocumentos;
let pequeno: EscenarioDeDocumentos;
let primerMes: EscenarioDeDocumentos;
let primerMesConVentas: EscenarioDeDocumentos;
let cadenaSupuesta: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;

const responder = (periodo: string, cifras: Record<string, string>): void => {
  RESPUESTAS.set(periodo, cifras);
};

const respuestaDe = (periodo: string): CifrasParaLaDeclaracion | null => {
  const cifras = RESPUESTAS.get(periodo);
  if (!cifras) return null;
  return {
    modulo: 'terceros',
    clave: 'ventas',
    cifras: Object.entries(cifras).map(([clave, valor]) => ({ clave, etiqueta: clave, tipo: 'monto', valor })),
  };
};

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'saldosindato');
  pequeno = await prepararEscenario(entorno, 'saldosindatopeq');
  primerMes = await prepararEscenario(entorno, 'saldoscero');
  primerMesConVentas = await prepararEscenario(entorno, 'saldoscerov');
  cadenaSupuesta = await prepararEscenario(entorno, 'saldoscadena');
  await configurarEmpresa(pequeno.cuenta, { regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'ninguno' });
  mediador.responder('terceros', 'libro-de-compras.cifras_para_la_declaracion', async ({ periodo }) =>
    respuestaDe(periodo),
  );
});

afterAll(() => vi.restoreAllMocks());

describe('un mes sin ventas no deja cierre calculado (débito desconocido)', () => {
  const ENERO = mesDe(-9);
  const FEBRERO = mesDe(-8);
  const SALDOS_DE_ENERO = { remanenteDeRetencionesAnterior: '10.00', remanenteDeCreditoAnterior: '4.00' };

  it('el mes siguiente no recibe como cierre los saldos con que abrió el anterior: queda sin dato y avisa', async () => {
    await declarar(propietario(), ENERO, SALDOS_DE_ENERO);
    responder(FEBRERO, { debito: '0.00', retenciones_de_iva: '1.00' });

    const declarada = await declarar(propietario(), FEBRERO);

    const foto = declarada.cuerpo.declaracion.foto;
    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales).toMatchObject({ formulario: 'SAT-2237', retenciones: null, credito: null });
    expect(foto.saldosIniciales.aviso).toContain('se declaró sin ventas');
    expect(declarada.cuerpo.avisos).toContain(foto.saldosIniciales.aviso);
  });

  it('lo que el usuario escribe en el mes siguiente es el saldo de apertura y el cálculo ya corre', async () => {
    const declarada = await declarar(propietario(), FEBRERO, {
      remanenteDeRetencionesAnterior: '10.00',
      remanenteDeCreditoAnterior: '4.00',
    });

    expect(declarada.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '10.00',
      creditoAnterior: '4.00',
      remanenteAlSiguiente: '11.00',
    });
    const { cambioDesdeLaDeclaracion: cambio } = await detalleDe(propietario(), FEBRERO);
    expect(cambio.cambios.filter((c: { clave: string }) => c.clave.startsWith('remanentes.'))).toEqual([]);
  });

  it('rectificar sin escribir nada conserva los saldos que ya traía la declaración', async () => {
    const rectificada = await declarar(propietario(), FEBRERO);

    expect(rectificada.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '10.00',
      creditoAnterior: '4.00',
    });
  });

  it('con declaraciones anteriores pero sin el mes previo, el saldo es «sin dato» y no cero', async () => {
    const SIN_PREVIO = mesDe(-4);
    responder(SIN_PREVIO, { debito: '0.00', retenciones_de_iva: '0.00' });

    const declarada = await declarar(propietario(), SIN_PREVIO);

    const foto = declarada.cuerpo.declaracion.foto;
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales).toMatchObject({ retenciones: null, credito: null });
    expect(foto.saldosIniciales.aviso).toContain('Falta declarar');
  });

  it('la pantalla del formulario también avisa cuando falta el saldo del mes previo', async () => {
    const { cuerpo } = await propietario().get(`${RUTA_SAT}?periodo=${mesDe(-4).slice(0, 7)}`);

    expect(cuerpo.remanentes).toBeNull();
    expect(cuerpo.avisoDeSaldos).toContain('Falta declarar');
  });
});

describe('saldos del SAT-2046 y cambio de formulario', () => {
  it('el pequeño contribuyente no guarda remanente de crédito fiscal aunque se escriba', async () => {
    const declarada = await declarar(pequeno.cuenta.propietario, mesDe(-5), {
      formulario: 'SAT-2046',
      remanenteDeRetencionesAnterior: '3.00',
      remanenteDeCreditoAnterior: '5.00',
    });

    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    expect(declarada.cuerpo.declaracion.foto.saldosIniciales).toEqual({
      formulario: 'SAT-2046',
      retenciones: '3.00',
      credito: '0.00',
    });
  });

  it('un mes previo con otro formulario no traslada sus saldos: quedan sin dato con aviso', async () => {
    const declarada = await declarar(pequeno.cuenta.propietario, mesDe(-4), { formulario: 'SAT-2237' });

    const saldos = declarada.cuerpo.declaracion.foto.saldosIniciales;
    expect(saldos).toMatchObject({ formulario: 'SAT-2237', retenciones: null, credito: null });
    expect(saldos.aviso).toContain('otro formulario');
  });
});

describe('el cero supuesto del primer mes no se guarda como dato', () => {
  it('sin ventas: declarar un mes reciente primero y luego el anterior deja el saldo sin dato al rectificar', async () => {
    const [ENERO, FEBRERO] = [mesDe(-13), mesDe(-12)];
    const propia = primerMes.cuenta.propietario;
    const primera = await declarar(propia, FEBRERO);
    expect(primera.cuerpo.declaracion.foto.saldosIniciales).toEqual({
      formulario: 'SAT-2237',
      retenciones: null,
      credito: null,
    });
    await declarar(propia, ENERO, { remanenteDeRetencionesAnterior: '10.00', remanenteDeCreditoAnterior: '4.00' });
    responder(FEBRERO, { debito: '8.00', retenciones_de_iva: '0.00' });

    const rectificada = await declarar(propia, FEBRERO);

    const foto = rectificada.cuerpo.declaracion.foto;
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales.aviso).toContain('se declaró sin ventas');
  });

  it('con ventas: el cero del primer mes se calcula, pero al rectificar con un mes previo vuelve a quedar sin dato', async () => {
    const [ENERO, FEBRERO] = [mesDe(-21), mesDe(-20)];
    const propia = primerMesConVentas.cuenta.propietario;
    responder(FEBRERO, { debito: '8.00', retenciones_de_iva: '0.00' });
    const primera = await declarar(propia, FEBRERO);
    expect(primera.cuerpo.declaracion.foto.remanentes).toMatchObject({
      remanenteAnterior: '0.00',
      impuestoAPagar: '8.00',
    });
    await declarar(propia, ENERO, { remanenteDeRetencionesAnterior: '10.00', remanenteDeCreditoAnterior: '4.00' });

    const rectificada = await declarar(propia, FEBRERO);

    const foto = rectificada.cuerpo.declaracion.foto;
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales.aviso).toContain('se declaró sin ventas');
  });
});

describe('un cierre que vino de un cero supuesto no se traslada como dato', () => {
  it('febrero con cero supuesto, enero declarado después: marzo queda sin dato y avisa', async () => {
    const [ENERO, FEBRERO, MARZO] = [mesDe(-26), mesDe(-25), mesDe(-24)];
    const propia = cadenaSupuesta.cuenta.propietario;
    responder(FEBRERO, { debito: '0.00', retenciones_de_iva: '5.00' });
    await declarar(propia, FEBRERO);
    await declarar(propia, ENERO, { remanenteDeRetencionesAnterior: '10.00', remanenteDeCreditoAnterior: '4.00' });
    responder(MARZO, { debito: '100.00', retenciones_de_iva: '0.00' });

    const declarada = await declarar(propia, MARZO);

    const foto = declarada.cuerpo.declaracion.foto;
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales).toMatchObject({ retenciones: null, credito: null });
    expect(foto.saldosIniciales.aviso).toContain('saldo supuesto en cero');
    const { cuerpo } = await propia.get(`${RUTA_SAT}?periodo=${MARZO.slice(0, 7)}`);
    expect(cuerpo.avisoDeSaldos).toContain('saldo supuesto en cero');
  });
});
