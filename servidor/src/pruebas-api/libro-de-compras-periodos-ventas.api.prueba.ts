import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import type { CifrasParaLaDeclaracion } from '../modulos/core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  instalarDestinoFalso,
  prepararEscenario,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { declarar, detalleDe, mesDe, registrarEn } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const P = mesDe(-2);
const PREGUNTADOS: string[] = [];
let escenario: EscenarioDeDocumentos;
let respuesta: CifrasParaLaDeclaracion | null = null;

const ventas = (debito: string, operaciones: string): CifrasParaLaDeclaracion => ({
  modulo: 'terceros',
  clave: 'ventas',
  cifras: [
    { clave: 'debito', etiqueta: 'Débito fiscal', tipo: 'monto', valor: debito },
    { clave: 'operaciones', etiqueta: 'Operaciones', tipo: 'cantidad', valor: operaciones },
  ],
});

const propietario = () => escenario.cuenta.propietario;

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'periodosventas');
  await registrarEn(escenario, P);
  mediador.responder('terceros', 'libro-de-compras.cifras_para_la_declaracion', async ({ periodo }) => {
    PREGUNTADOS.push(periodo);
    return respuesta;
  });
});

afterAll(() => vi.restoreAllMocks());

describe('las cifras de ventas en la foto de la declaración', () => {
  it('sin respuesta de ningún módulo la foto sale como siempre, sin ventas', async () => {
    const declarada = await declarar(propietario(), P);

    expect(declarada.estado, JSON.stringify(declarada.cuerpo)).toBe(200);
    expect(declarada.cuerpo.declaracion.foto.ventas).toBeUndefined();
    expect(PREGUNTADOS).toEqual([P]);
  });

  it('declarar guarda en la foto lo que responde el módulo de ventas', async () => {
    respuesta = ventas('120.00', '3');

    const declarada = await declarar(propietario(), P);

    expect(declarada.cuerpo.declaracion.evento).toBe('rectificacion');
    expect(declarada.cuerpo.declaracion.foto.ventas).toEqual([respuesta]);
    expect(declarada.cuerpo.declaracion.diferencia.cambios).toEqual(
      expect.arrayContaining([
        { clave: 'ventas[terceros].debito', anterior: '0.00', actual: '120.00', cambio: '120.00' },
        { clave: 'ventas[terceros].operaciones', anterior: '0', actual: '3', cambio: '3' },
      ]),
    );
  });

  it('el detalle no ve cambios si las cifras de ventas siguen iguales, y los ve si cambian', async () => {
    expect((await detalleDe(propietario(), P)).cambioDesdeLaDeclaracion.cambios).toEqual([]);

    respuesta = ventas('150.00', '4');

    const { cambioDesdeLaDeclaracion: cambio } = await detalleDe(propietario(), P);
    expect(cambio.cambios).toEqual([
      { clave: 'ventas[terceros].debito', anterior: '120.00', actual: '150.00', cambio: '30.00' },
      { clave: 'ventas[terceros].operaciones', anterior: '3', actual: '4', cambio: '1' },
    ]);
  });

  it('la rectificación compara las cifras de ventas contra la declaración anterior', async () => {
    const rectificada = await declarar(propietario(), P);

    expect(rectificada.cuerpo.declaracion.foto.ventas).toEqual([ventas('150.00', '4')]);
    expect(rectificada.cuerpo.declaracion.diferencia.cambios).toEqual(
      expect.arrayContaining([
        { clave: 'ventas[terceros].debito', anterior: '120.00', actual: '150.00', cambio: '30.00' },
      ]),
    );
  });
});
