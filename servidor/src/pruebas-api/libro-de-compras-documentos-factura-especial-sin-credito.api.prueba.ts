import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { VendedoresDePrueba } from './soporte/factura-especial.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let vendedores: VendedoresDePrueba;

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'facturaespecialsincredito');
  vendedores = new VendedoresDePrueba(escenario);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'no_afiliado',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
});

afterAll(() => vi.restoreAllMocks());

describe('factura especial de una empresa sin crédito ni contabilidad completa', () => {
  it('se registra sin bloquear: el IVA va al costo, se retiene igual y se avisa', async () => {
    const vendedor = await vendedores.nuevo();

    const respuesta = await escenario.cuenta.propietario.post(
      RUTA_DOCUMENTOS,
      vendedores.cuerpo(vendedor.proveedorId, { nitReceptor: nitValido('4200001') }),
    );

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({
      motivoSinCredito: 'empresa_sin_credito',
      totales: { iva: '600.00', ivaNoAcreditable: '600.00' },
    });
    expect(respuesta.cuerpo.documento.retenciones.map((r: { regla: string }) => r.regla)).toEqual([
      'iva_factura_especial',
      'isr_factura_especial',
    ]);
    expect(respuesta.cuerpo.avisos).toEqual(
      expect.arrayContaining([
        'Su empresa no lleva contabilidad completa: confirme con su contador la retención del ISR (Decreto 10-2012 art. 16).',
        'Su empresa no está afiliada al IVA: confirme su habilitación como emisora de facturas especiales.',
      ]),
    );
  });
});
