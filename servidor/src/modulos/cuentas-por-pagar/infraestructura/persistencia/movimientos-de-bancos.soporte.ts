/**
 * Soporte de las pruebas de pagos y reintegros: un movimiento de Bancos (cheque o nota) al que apuntan las llaves.
 * Se escribe directo en las tablas de Bancos porque las pruebas de tablas no pasan por sus casos de uso.
 */
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { bancos } from '../../../bancos/infraestructura/persistencia/bancos.tablas.js';
import { conceptos } from '../../../bancos/infraestructura/persistencia/conceptos.tablas.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';

let secuencia = 0;

/** Crea un banco, una cuenta y un concepto, y devuelve una función que crea movimientos de esa empresa. */
export async function prepararBancos(contexto: ContextoEmpresa): Promise<() => Promise<string>> {
  const { empresaId } = contexto;
  const { cuentaId, conceptoId } = await enTransaccionSegura(contexto, async (tx) => {
    const [banco] = await tx.insert(bancos).values({ empresaId, nombre: 'Banco de pruebas' }).returning();
    const [cuenta] = await tx
      .insert(cuentasBancarias)
      .values({
        empresaId,
        nombre: 'Cuenta de pruebas',
        bancoId: banco!.id,
        numero: '001',
        numeroNormalizado: '001',
        tipo: 'monetaria',
      })
      .returning();
    const [concepto] = await tx
      .insert(conceptos)
      .values({ empresaId, nombre: 'Pago a proveedores', aplicaA: 'ambos', actividadDeFlujo: 'operacion' })
      .returning();
    return { cuentaId: cuenta!.id, conceptoId: concepto!.id };
  });
  return async () => {
    secuencia += 1;
    const [fila] = await enTransaccionSegura(contexto, (tx) =>
      tx
        .insert(movimientos)
        .values({
          empresaId,
          cuentaBancariaId: cuentaId,
          tipo: 'cheque',
          fecha: '2026-03-10',
          monto: '100',
          conceptoId,
          referencia: `CH${secuencia}`,
        })
        .returning(),
    );
    return fila!.id;
  };
}
