import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDelDocumento } from '../servicios/tipos';
import { detallesDeMontos } from './detalles-de-documento';

// Los formatos de monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const ficha = (cambios: Partial<FichaDelDocumento>): FichaDelDocumento =>
  ({
    origen: 'libro_de_compras',
    clase: 'abono',
    total: '1120.00',
    retenciones: '0.00',
    neto: '1120.00',
    aplicado: '1080.00',
    ajustado: '25.00',
    saldo: '15.00',
    ...cambios,
  }) as FichaDelDocumento;

describe('detallesDeMontos de una nota de crédito', () => {
  it('muestra Ajustado entre Aplicado y el saldo a favor, de modo que todo suma el total', () => {
    const detalles = detallesDeMontos(ficha({}));
    const etiquetas = detalles.map((detalle) => detalle.etiqueta);
    expect(etiquetas).toEqual([
      'Total',
      'Retenciones',
      'Neto a pagar',
      'Aplicado a otros documentos',
      'Ajustado (dado de baja)',
      'Saldo a favor',
    ]);
    expect(detalles.find((detalle) => detalle.etiqueta === 'Ajustado (dado de baja)')?.valor).toMatch(/25\.00/);
  });

  it('un cargo no muestra Ajustado y conserva «Aplicado (notas de crédito)»', () => {
    const etiquetas = detallesDeMontos(ficha({ clase: 'cargo' })).map((detalle) => detalle.etiqueta);
    expect(etiquetas).toContain('Aplicado (notas de crédito)');
    expect(etiquetas).not.toContain('Ajustado (dado de baja)');
  });
});
