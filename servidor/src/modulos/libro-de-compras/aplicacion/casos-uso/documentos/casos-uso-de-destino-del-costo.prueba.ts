import { beforeEach, describe, expect, it } from 'vitest';
import { InventarioNoEsBien, LineaConDosDestinosDelCosto } from '../../../dominio/errores-de-documento.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeLinea } from '../../dto/solicitud-de-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let { catalogos, dependencias } = crearEscenario();

const registrar = (linea: Partial<SolicitudDeLinea>) => {
  const base = solicitud();
  return new RegistrarDocumento(dependencias).ejecutar(operador, {
    solicitud: { ...base, lineas: [{ ...base.lineas[0]!, ...linea }] },
    puedeAjustarRetenciones: false,
  });
};

beforeEach(() => {
  ({ catalogos, dependencias } = crearEscenario());
});

describe('destino del costo de la línea: activo fijo o inventario', () => {
  it('una línea de inventario de tipo bien se registra', async () => {
    const documento = await registrar({ esInventario: true });

    expect(documento.documento.lineas[0]).toMatchObject({ esInventario: true, esActivoFijo: false });
  });

  it('la línea toma la marca de inventario del concepto', async () => {
    catalogos.listaDeConceptos[0]!.esInventario = true;

    expect((await registrar({})).documento.lineas[0]?.esInventario).toBe(true);
  });

  it('la línea puede quitar la marca que propone el concepto', async () => {
    catalogos.listaDeConceptos[0]!.esInventario = true;

    expect((await registrar({ esInventario: false })).documento.lineas[0]?.esInventario).toBe(false);
  });

  it('no puede ser activo fijo e inventario a la vez', async () => {
    const dosDestinos = registrar({ esActivoFijo: true, esInventario: true });

    await expect(dosDestinos).rejects.toThrow(LineaConDosDestinosDelCosto);
  });

  it('el concepto de activo fijo con la línea de inventario también se rechaza', async () => {
    catalogos.listaDeConceptos[0]!.esActivoFijo = true;

    await expect(registrar({ esInventario: true })).rejects.toThrow(LineaConDosDestinosDelCosto);
  });

  it('un servicio no es inventario', async () => {
    await expect(registrar({ tipo: 'servicio', esInventario: true })).rejects.toThrow(InventarioNoEsBien);
  });
});
