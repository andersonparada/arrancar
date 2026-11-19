import { beforeEach, describe, expect, it } from 'vitest';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();

const registrar = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(cambios),
    puedeAjustarRetenciones: false,
  });

beforeEach(() => {
  e = crearEscenario();
});

describe('referencia de destino', () => {
  it('pasa tal cual al destino', async () => {
    const referenciaDeDestino = crypto.randomUUID();

    await registrar({ referenciaDeDestino });

    expect(e.destinos.recibidos[0]?.referenciaDeDestino).toBe(referenciaDeDestino);
  });

  it('sin ella el destino recibe nulo, igual que hoy', async () => {
    await registrar();

    expect(e.destinos.recibidos[0]?.referenciaDeDestino ?? null).toBeNull();
  });
});
