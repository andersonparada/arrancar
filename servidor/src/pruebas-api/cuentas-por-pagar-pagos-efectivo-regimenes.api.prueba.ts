/**
 * La bancarización del pago en efectivo según otros regímenes (CP4-E3): IVA general con ISR opcional simplificado (solo el
 * crédito fiscal) y una empresa sin datos fiscales (solo avisa).
 */

import { describe, expect, it } from 'vitest';
import { pagoEnEfectivo, repartirBien, repartirMal, unRetiro } from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();

describe('IVA general con ISR opcional simplificado', () => {
  it('solo nombra el crédito fiscal en el texto', async () => {
    const simplificado = await EscenarioDePagos.preparar(entorno, 'cxpefectivosimpl', {
      regimenIsr: 'opcional_simplificado',
      agenteDeRetencionIva: 'contribuyente_especial',
    });
    await simplificado.fondear('50000.00');
    const { proveedor, cargo } = await simplificado.proveedorConCargo('30000.00');
    const retiro = await unRetiro(simplificado, '5000.00');

    const usuario = await crearUsuarioConPermisos(entorno, simplificado.mundo.escenario.cuenta, {
      nombres: 'Sin excepción',
      apellidos: 'Simplificado',
      permisos: ['cuentas-por-pagar.retiros.ver', 'cuentas-por-pagar.pagos.pagar-en-efectivo'],
    });
    const error = await repartirMal(usuario, retiro.id, {
      pagos: [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }])],
      estado: 422,
      codigo: 'efectivo_sobre_el_umbral',
    });

    expect(error.mensaje).toContain('no es crédito fiscal');
    expect(error.mensaje).not.toContain('deducible del ISR');
  });
});

describe('empresa sin datos fiscales', () => {
  it('un saldo inicial de Q30,000 o más solo avisa que complete los datos fiscales', async () => {
    const sin = await EscenarioDePagos.preparar(entorno, 'cxpefectivosin');
    await consultar('delete from libro_de_compras.datos_fiscales_de_empresa where empresa_id = $1', [
      sin.mundo.escenario.cuenta.empresaId,
    ]);
    const saldo = await sin.mundo.documentos.sembrarSaldoInicial({
      total: '40000',
      retenciones: '0',
      saldoAlInicio: '35000',
      retencionesPorPracticar: '0',
    });
    await sin.autorizar(saldo, { yaCompletado: true });
    const proveedorId = sin.mundo.escenario.proveedorId;
    await sin.contrasena({ proveedorId, nitEmisor: '' }, [saldo]);
    const retiro = await unRetiro(sin, '5000.00');

    const respuesta = await repartirBien(sin.propietario(), retiro.id, [
      pagoEnEfectivo(proveedorId, [{ cargoId: saldo, monto: '1000.00' }]),
    ]);

    expect(respuesta.pagos[0].avisos.join(' ')).toContain('Complete los datos fiscales de la empresa');
    expect(respuesta.pagos[0].motivoSinBancarizar).toBeNull();
  });
});
