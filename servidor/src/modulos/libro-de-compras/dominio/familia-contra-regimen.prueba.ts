import { describe, expect, it } from 'vitest';
import { REGIMENES_DE_IVA_DE_PROVEEDOR, type RegimenDeIvaDeProveedor } from './datos-fiscales-de-proveedor.js';
import { TipoNoCorrespondeAlProveedor } from './errores-de-documento.js';
import { exigirTipoDelProveedor } from './reglas-del-encabezado.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

const SIN_CONFIRMAR: Array<[TipoDeDocumento, RegimenDeIvaDeProveedor[]]> = [
  ['factura', ['general', 'no_domiciliado']],
  ['factura_pequeno_contribuyente', ['pequeno_contribuyente']],
  ['factura_pequeno_contribuyente_electronico', ['pequeno_contribuyente_electronico', 'pequeno_contribuyente']],
  ['factura_contribuyente_agropecuario', ['contribuyente_agropecuario', 'primario', 'pecuario', 'general']],
  ['factura_primario_pecuario', ['primario', 'pecuario']],
];

describe('familia contra régimen del proveedor', () => {
  it.each(SIN_CONFIRMAR)('%s: solo los regímenes de su tabla pasan sin confirmar', (tipo, permitidos) => {
    for (const regimen of REGIMENES_DE_IVA_DE_PROVEEDOR) {
      if (permitidos.includes(regimen)) {
        expect(exigirTipoDelProveedor(tipo, regimen)).toBe(false);
      } else {
        expect(() => exigirTipoDelProveedor(tipo, regimen)).toThrow(TipoNoCorrespondeAlProveedor);
      }
    }
  });

  it.each(SIN_CONFIRMAR)('%s: con la confirmación del cambio de régimen pasa y lo señala', (tipo, permitidos) => {
    const otro = REGIMENES_DE_IVA_DE_PROVEEDOR.find((regimen) => !permitidos.includes(regimen))!;

    expect(exigirTipoDelProveedor(tipo, otro, true)).toBe(true);
  });

  it('la factura especial, la nota y el recibo no se revisan contra el régimen', () => {
    for (const tipo of ['factura_especial', 'nota_de_credito', 'recibo'] as const) {
      for (const regimen of REGIMENES_DE_IVA_DE_PROVEEDOR) {
        expect(exigirTipoDelProveedor(tipo, regimen)).toBe(false);
      }
    }
  });

  it('el error sugiere confirmar el cambio de régimen', () => {
    expect(() => exigirTipoDelProveedor('factura_primario_pecuario', 'general')).toThrow(
      expect.objectContaining({
        codigo: 'tipo_no_corresponde_al_proveedor',
        detalles: { confirmarCon: 'confirmarCambioDeRegimen' },
      }),
    );
  });
});
