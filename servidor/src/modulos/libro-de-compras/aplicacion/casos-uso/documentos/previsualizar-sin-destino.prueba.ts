import { describe, expect, it } from 'vitest';
import { DestinoNoDisponible } from '../../../dominio/errores-de-documento.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { PrevisualizarDocumento } from './previsualizar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

describe('la vista previa no exige destino; solo registrar', () => {
  const previsualizar = (cambios: Partial<SolicitudDeDocumento>, instalados: string[] = []) => {
    const escenario = crearEscenario();
    escenario.destinos.instalados = instalados as typeof escenario.destinos.instalados;
    return new PrevisualizarDocumento(escenario.dependencias).ejecutar(operador, {
      solicitud: solicitud(cambios),
      puedeAjustarRetenciones: false,
    });
  };

  it('sin destino y sin ninguno instalado calcula igual y no avisa del destino', async () => {
    const { documento, avisos } = await previsualizar({ destino: null });

    expect(documento.totales.iva).toBe('120.00');
    expect(avisos.filter((aviso) => aviso.includes('destino'))).toEqual([]);
  });

  it('con un destino que no está activo calcula y agrega un aviso', async () => {
    const { documento, avisos } = await previsualizar({ destino: 'caja-chica' });

    expect(documento.totales.iva).toBe('120.00');
    expect(avisos).toContain(new DestinoNoDisponible('caja-chica').message);
  });

  it('con el destino activo no agrega aviso', async () => {
    const { avisos } = await previsualizar({ destino: 'cuentas-por-pagar' }, ['cuentas-por-pagar']);

    expect(avisos.filter((aviso) => aviso.includes('destino'))).toEqual([]);
  });

  it('registrar sin destino sigue rechazándose', async () => {
    const escenario = crearEscenario();
    const registrar = new RegistrarDocumento(escenario.dependencias).ejecutar(operador, {
      solicitud: solicitud({ destino: null }),
      puedeAjustarRetenciones: false,
    });

    await expect(registrar).rejects.toThrow(DestinoNoDisponible);
  });
});
