/**
 * BS-2: las rutas heredadas del saldo inicial «de antes» (`saldo_global`) que el cliente actual todavía usa; se borran
 * con el paso BS-5 (cliente nuevo).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { empresaConInicio, fichaDe, RUTA_DE_APERTURA } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Saldos globales', usuario: 'propietariosaldosglobales' });
});

describe('rutas heredadas del saldo inicial «de antes» (hasta BS-5)', () => {
  it('el cliente actual lee con ?cuentaBancariaId y corrige y elimina por /global/:movimientoId', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    const datos = {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2025-10-01',
      monto: '300.00',
      referencia: null,
      observaciones: null,
    };
    const creado = await usuario().post(RUTA_DE_APERTURA, datos);

    const heredada = (await usuario().get(`${RUTA_DE_APERTURA}?cuentaBancariaId=${cuentaId}`)).cuerpo;
    const corregido = await usuario().put(`${RUTA_DE_APERTURA}/global/${creado.cuerpo.id}`, {
      ...datos,
      monto: '350.00',
    });
    const nueva = (await usuario().get(RUTA_DE_APERTURA)).cuerpo;
    const eliminado = await usuario().delete(`${RUTA_DE_APERTURA}/global/${creado.cuerpo.id}`, { motivo: 'prueba' });

    expect(heredada).toHaveLength(1);
    expect(heredada[0]).toMatchObject({ id: creado.cuerpo.id, monto: '300.00', saldoInicial: true });
    expect(corregido.cuerpo.monto).toBe('350.00');
    expect(nueva.cuentas.find((c: { cuentaBancariaId: string }) => c.cuentaBancariaId === cuentaId)).toMatchObject({
      forma: 'global',
      saldoEnLibrosAlCorte: '350.00',
    });
    expect(eliminado.estado).toBe(204);
    expect((await fichaDe(usuario(), cuentaId)).forma).toBe('sin_saldo');
  });

  it('el saldo del banco de la ventana nueva no se puede tocar con las rutas heredadas', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await usuario().put(`${RUTA_DE_APERTURA}/${cuentaId}`, { saldoSegunEstadoDeCuenta: '100.00' });
    const [saldo] = (await usuario().get(`${RUTA_DE_APERTURA}?cuentaBancariaId=${cuentaId}`)).cuerpo;

    const corregido = await usuario().put(`${RUTA_DE_APERTURA}/global/${saldo.id}`, {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2025-12-31',
      monto: '5.00',
      referencia: null,
      observaciones: null,
    });
    const eliminado = await usuario().delete(`${RUTA_DE_APERTURA}/global/${saldo.id}`, { motivo: 'x' });

    expect(corregido.cuerpo.error.codigo).toBe('no_es_un_saldo_inicial');
    expect(eliminado.cuerpo.error.codigo).toBe('no_es_un_saldo_inicial');
  });
});
