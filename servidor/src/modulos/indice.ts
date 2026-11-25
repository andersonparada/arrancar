import { moduloCore } from './core/modulo.js';
import type { DefinicionModulo } from './core/modulos-sistema/definicion-modulo.js';
import { moduloEmpresas } from './empresas/modulo.js';
import { moduloTerceros } from './terceros/modulo.js';
import { moduloBancos } from './bancos/modulo.js';
import { moduloLibroDeCompras } from './libro-de-compras/modulo.js';
import { moduloCuentasPorPagar } from './cuentas-por-pagar/modulo.js';
import { moduloCajaChica } from './caja-chica/modulo.js';
import { moduloCuentasPorLiquidar } from './cuentas-por-liquidar/modulo.js';
import { moduloActivosFijos } from './activos-fijos/modulo.js';
import { moduloInventarios } from './inventarios/modulo.js';
import { moduloMultimoneda } from './multimoneda/modulo.js';
import { moduloParcelas } from './parcelas/modulo.js';
import { moduloLibroDeVentas } from './libro-de-ventas/modulo.js';
import { moduloContabilidad } from './contabilidad/modulo.js';
// generador: importaciones

/** Módulos instalados. `npm run generar -- modulo <clave>` suma uno nuevo en la marca. */
export const definicionesModulos: readonly DefinicionModulo[] = [
  moduloCore,
  moduloEmpresas,
  moduloTerceros,
  moduloBancos,
  moduloLibroDeCompras,
  moduloCuentasPorPagar,
  moduloCajaChica,
  moduloCuentasPorLiquidar,
  moduloActivosFijos,
  moduloInventarios,
  moduloMultimoneda,
  moduloParcelas,
  moduloLibroDeVentas,
  moduloContabilidad,
  // generador: modulos
];
