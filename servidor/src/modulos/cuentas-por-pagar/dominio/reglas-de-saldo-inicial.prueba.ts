import { describe, expect, it } from 'vitest';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from './documento-por-pagar.js';
import { SaldoInicialAutorizado, SaldoInicialConMovimientos } from './errores-de-saldos-iniciales.js';
import { REGLAS_PARA_CORREGIR_SALDO_INICIAL } from './reglas-de-saldo-inicial.js';

function guardado(
  cambios: Partial<DocumentoPorPagar> = {},
  aplicaciones: Partial<Pick<DocumentoConAplicaciones, 'hechas' | 'recibidas'>> = {},
): DocumentoConAplicaciones {
  const documento: DocumentoPorPagar = {
    id: crypto.randomUUID(),
    origen: 'saldo_inicial',
    documentoId: null,
    serie: 'S',
    numero: '1',
    tipo: 'factura',
    proveedorId: crypto.randomUUID(),
    documentoAfectadoId: null,
    fechaEmision: '2025-12-20',
    totalCentavos: 1000,
    retencionesCentavos: 0,
    saldoAlInicioCentavos: 1000,
    retencionesPorPracticarCentavos: 0,
    referencia: null,
    tieneActivoFijo: false,
    vencimiento: '2026-01-20',
    estado: 'registrado',
    ingresadoPor: null,
    registradoEn: null,
    registradoPor: null,
    autorizadoEn: null,
    autorizadoPor: null,
    autorizacionPropia: false,
    ...cambios,
  };
  return { documento, hechas: [], recibidas: [], ...aplicaciones };
}

async function revisar(saldo: DocumentoConAplicaciones): Promise<void> {
  for (const regla of REGLAS_PARA_CORREGIR_SALDO_INICIAL) await regla(saldo);
}

const aplicacion = { notaId: 'n', cargoId: 'c', montoCentavos: 100 };

describe('las reglas para corregir o eliminar un saldo inicial', () => {
  it('un saldo inicial completado y sin movimientos pasa todas', async () => {
    await expect(revisar(guardado())).resolves.toBeUndefined();
  });

  it('uno autorizado se rechaza y el mensaje dice cuál es', async () => {
    const autorizado = guardado({ estado: 'autorizado' });

    await expect(revisar(autorizado)).rejects.toThrow(SaldoInicialAutorizado);
    await expect(revisar(autorizado)).rejects.toThrow('S-1');
  });

  it('uno con notas recibidas o hechas se rechaza', async () => {
    await expect(revisar(guardado({}, { recibidas: [aplicacion] }))).rejects.toThrow(SaldoInicialConMovimientos);
    await expect(revisar(guardado({ tipo: 'nota_de_credito' }, { hechas: [aplicacion] }))).rejects.toThrow(
      SaldoInicialConMovimientos,
    );
  });
});
