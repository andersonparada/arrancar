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
import { declarar, mesDe } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const RESPUESTAS = new Map<string, Record<string, string>>();
let escenario: EscenarioDeDocumentos;

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
  escenario = await prepararEscenario(entorno, 'saldoscadenalarga');
  mediador.responder('terceros', 'libro-de-compras.cifras_para_la_declaracion', async ({ periodo }) =>
    respuestaDe(periodo),
  );
});

afterAll(() => vi.restoreAllMocks());

describe('un cero supuesto no llega como dato a meses más lejanos', () => {
  it('febrero y marzo declarados, enero después: abril no hereda el cero supuesto y avisa', async () => {
    const [ENERO, FEBRERO, MARZO, ABRIL] = [mesDe(-40), mesDe(-39), mesDe(-38), mesDe(-37)];
    const propia = escenario.cuenta.propietario;
    responder(FEBRERO, { debito: '0.00', retenciones_de_iva: '5.00' });
    responder(MARZO, { debito: '0.00', retenciones_de_iva: '1.00' });
    responder(ABRIL, { debito: '100.00', retenciones_de_iva: '0.00' });
    await declarar(propia, FEBRERO);
    const marzo = await declarar(propia, MARZO);
    expect(marzo.cuerpo.declaracion.foto.remanentes).toMatchObject({ remanenteAnterior: '5.00' });
    await declarar(propia, ENERO, { remanenteDeRetencionesAnterior: '10.00', remanenteDeCreditoAnterior: '4.00' });

    const declarada = await declarar(propia, ABRIL);

    const foto = declarada.cuerpo.declaracion.foto;
    expect(foto.remanentes).toBeUndefined();
    expect(foto.saldosIniciales).toMatchObject({ retenciones: null, credito: null });
    expect(foto.saldosIniciales.aviso).toContain('saldo supuesto en cero');
  });

  it('sin enero, abril sí recibe el cierre de marzo (el cero supuesto es el primer mes)', async () => {
    const [FEBRERO, MARZO, ABRIL] = [mesDe(-60), mesDe(-59), mesDe(-58)];
    const propia = escenario.cuenta.propietario;
    responder(FEBRERO, { debito: '0.00', retenciones_de_iva: '5.00' });
    responder(MARZO, { debito: '0.00', retenciones_de_iva: '1.00' });
    responder(ABRIL, { debito: '100.00', retenciones_de_iva: '0.00' });
    await declarar(propia, FEBRERO);
    await declarar(propia, MARZO);

    const declarada = await declarar(propia, ABRIL);

    expect(declarada.cuerpo.declaracion.foto.remanentes).toMatchObject({ remanenteAnterior: '6.00' });
  });
});
