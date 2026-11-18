/**
 * Prueba de integración contra PostgreSQL: el filtro `estadoDePago` de la lista de documentos usa la misma regla que
 * `estadoDePagoDe` (§2.4): comprometido es un cheque posfechado que ya cubre el saldo.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import type { EstadoDePago } from '../../dominio/pagos.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { ConsultasDeDocumentosDrizzle } from './consultas-de-documentos.drizzle.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';
import { prepararBancos } from './movimientos-de-bancos.soporte.js';
import { pagos } from './pagos.tablas.js';

const HOY = '2026-03-20';
let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

/** Un cargo de 112 con, si se pide, un pago vigente de `monto` en `fecha` (dentro de su propia contraseña). */
async function cargoConPago(pago?: { monto: string; fecha: string }): Promise<string> {
  const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
  const cargo = (
    await enTransaccionSegura(contexto(), (tx) =>
      tx.insert(documentos).values(documentoValido(e, documentoId)).returning(),
    )
  )[0]!;
  if (!pago) return cargo.id;
  secuencia += 1;
  const movimientoId = await nuevoMovimiento();
  await enTransaccionSegura(contexto(), async (tx) => {
    const [contrasena] = await tx
      .insert(contrasenas)
      .values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        numero: secuencia,
        fecha: '2026-03-10',
        fechaDePago: '2026-04-10',
      })
      .returning();
    await tx.insert(contrasenaDocumentos).values({
      empresaId: e.empresaA1,
      proveedorId: e.proveedorA,
      contrasenaId: contrasena!.id,
      documentoId: cargo.id,
    });
    const [fila] = await tx
      .insert(pagos)
      .values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        numero: secuencia,
        forma: 'cheque',
        fecha: pago.fecha,
        monto: pago.monto,
        movimientoId,
      })
      .returning();
    await tx.insert(aplicacionesDePagos).values({
      empresaId: e.empresaA1,
      proveedorId: e.proveedorA,
      pagoId: fila!.id,
      contrasenaId: contrasena!.id,
      cargoId: cargo.id,
      monto: pago.monto,
    });
  });
  return cargo.id;
}

const idsConEstado = (estadoDePago: EstadoDePago) =>
  enTransaccionSegura(contexto(), async () => {
    const { filas } = await new ConsultasDeDocumentosDrizzle().listar(
      { estadoDePago },
      { pagina: 1, limite: 200 },
      HOY,
    );
    return filas.map(({ documento }) => documento.id);
  });

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarestadopago');
  nuevoMovimiento = await prepararBancos(contexto());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('filtro de estado de pago de la lista de documentos', () => {
  it('separa pendiente, en parte, comprometido y pagado', async () => {
    const pendiente = await cargoConPago();
    const enParte = await cargoConPago({ monto: '50', fecha: '2026-03-15' });
    const pagado = await cargoConPago({ monto: '112', fecha: '2026-03-15' });
    const comprometido = await cargoConPago({ monto: '112', fecha: '2026-04-01' });
    const parteComprometida = await cargoConPago({ monto: '50', fecha: '2026-04-01' });

    expect(await idsConEstado('pendiente')).toEqual([pendiente]);
    expect((await idsConEstado('en_parte')).sort()).toEqual([enParte, parteComprometida].sort());
    expect(await idsConEstado('pagado')).toEqual([pagado]);
    expect(await idsConEstado('comprometido')).toEqual([comprometido]);
  });
});
