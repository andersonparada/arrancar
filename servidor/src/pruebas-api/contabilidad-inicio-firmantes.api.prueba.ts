import { describe, expect, it } from 'vitest';
import { empresaConInicio } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const RUTA = '/api/contabilidad/inicio';
const entorno = usarEntornoApi();

const inicio = (cambios: Record<string, unknown> = {}) => ({
  fecha: '2026-01-01',
  caso: 'desde_la_carga',
  mascara: '9.9.99.99',
  ...cambios,
});

describe('firmantes del inicio: se cambian en cualquier momento', () => {
  it('con el caso «posterior» y la carga reabierta, solo cambiar el contador sigue funcionando', async () => {
    const cuenta = await empresaConInicio(entorno, {
      nombre: 'Firmantes posterior',
      usuario: 'propietarioposterior',
      modulos: ['terceros', 'contabilidad'],
    });
    const carga = `/api/empresas/${cuenta.empresaId}/carga-inicial`;
    expect((await cuenta.propietario.post(`${carga}/cerrar`, { motivo: 'Lista' })).estado).toBe(200);
    const posterior = inicio({ caso: 'posterior', fecha: '2026-07-01' });
    expect((await cuenta.propietario.put(RUTA, posterior)).estado).toBe(200);
    await cuenta.propietario.post(`${carga}/reabrir`, { motivo: 'Corregir' });

    const nuevoContador = await cuenta.propietario.put(RUTA, {
      ...posterior,
      firmaContador: 'Luis Gómez',
      registroDelContador: '1234',
    });
    const otraFecha = await cuenta.propietario.put(RUTA, { ...posterior, fecha: '2026-08-01' });

    expect(nuevoContador.estado).toBe(200);
    expect(nuevoContador.cuerpo.firmaContador).toBe('Luis Gómez');
    expect(otraFecha.cuerpo.error.codigo).toBe('carga_inicial_abierta');
  });

  it('con «desde la carga» y la fecha de la empresa cambiada, guardar los firmantes con la fecha guardada sigue funcionando', async () => {
    const cuenta = await empresaConInicio(entorno, {
      nombre: 'Firmantes desde la carga',
      usuario: 'propietariodesde',
      modulos: ['terceros', 'contabilidad'],
    });
    expect((await cuenta.propietario.put(RUTA, inicio())).estado).toBe(200);
    const carga = `/api/empresas/${cuenta.empresaId}/carga-inicial`;
    expect((await cuenta.propietario.put(carga, { fechaDeInicio: '2026-02-01' })).estado).toBe(200);

    const firmantes = await cuenta.propietario.put(RUTA, inicio({ firmaRepresentante: 'Ana Pérez' }));
    const fechaNueva = await cuenta.propietario.put(RUTA, inicio({ fecha: '2026-03-01' }));

    expect(firmantes.estado).toBe(200);
    expect(firmantes.cuerpo.firmaRepresentante).toBe('Ana Pérez');
    expect(fechaNueva.cuerpo.error.codigo).toBe('inicio_invalido');
  });
});
