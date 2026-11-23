import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeAccionesComponidas } from './composicion/acciones.js';
import { rutasDeAplicacionesComponidas } from './composicion/aplicaciones.js';
import { rutasDeAvisosDePagoComponidas } from './composicion/avisos-de-pago.js';
import { rutasDeAjustesComponidas } from './composicion/ajustes.js';
import { rutasDeBajasComponidas } from './composicion/bajas.js';
import { rutasDeCondicionesComponidas } from './composicion/condiciones.js';
import { rutasDeConsultasComponidas } from './composicion/consultas.js';
import { rutasDeConsultaDePagosComponidas } from './composicion/consulta-de-pagos.js';
import { rutasDeContrasenasComponidas } from './composicion/contrasenas.js';
import { rutasDeDocumentosComponidas } from './composicion/documentos.js';
import { escuchasDeFechaDeInicioComponidas } from './composicion/fecha-de-inicio.js';
import { rutasDelCuadreDeSaldosInicialesComponidas } from './composicion/cuadre-de-saldos-iniciales.js';
import { rutasDePagosComponidas } from './composicion/pagos.js';
import { rutasDeReportesDeEfectivoComponidas } from './composicion/reportes-de-efectivo.js';
import { rutasDeReportesDePagosComponidas } from './composicion/reportes-de-pagos.js';
import { rutasDePagosEnEfectivoComponidas } from './composicion/pagos-en-efectivo.js';
import { respuestaDePagadoAlProveedorComponida } from './composicion/pagado-al-proveedor.js';
import { respuestaDeLlavesDeEnlaceComponida } from './composicion/llaves-de-enlace.js';
import { rutasDeReintegrosComponidas } from './composicion/reintegros.js';
import { rutasDeReportesDeProveedorComponidas } from './composicion/reportes-de-proveedor.js';
import { rutasDeReportesDeSaldosComponidas } from './composicion/reportes-de-saldos.js';
import { rutasDeRetirosComponidas } from './composicion/retiros.js';
import { rutasDeSaldosInicialesComponidas } from './composicion/saldos-iniciales.js';
import { configuracionDeCuentasPorPagar } from './configuracion.js';
import { PERMISOS_DE_CUENTAS_POR_PAGAR } from './permisos.js';
// generador: importaciones

/**
 * Lo que cada empresa debe a sus proveedores: documentos recibidos de Libro de compras, vencimientos, autorización,
 * contraseñas y pagos. Ver `docs/modulos/cuentas-por-pagar.md`.
 */
export const moduloCuentasPorPagar: DefinicionModulo = {
  clave: 'cuentas-por-pagar',
  nombre: 'Cuentas por pagar',
  descripcion:
    'Lo que cada empresa debe a sus proveedores: documentos, vencimientos, autorización, contraseñas y pagos',
  dependeDe: ['libro-de-compras', 'bancos'],
  permisos: PERMISOS_DE_CUENTAS_POR_PAGAR,
  configuracion: configuracionDeCuentasPorPagar,
  rutas: rutasDelModulo([
    rutasDeDocumentosComponidas(),
    rutasDeCondicionesComponidas(),
    rutasDeConsultasComponidas(),
    rutasDeAccionesComponidas(),
    rutasDeBajasComponidas(),
    rutasDeAplicacionesComponidas(),
    rutasDeAjustesComponidas(),
    escuchasDeFechaDeInicioComponidas(),
    rutasDelCuadreDeSaldosInicialesComponidas(),
    rutasDeSaldosInicialesComponidas(),
    rutasDeContrasenasComponidas(),
    rutasDePagosComponidas(),
    rutasDeAvisosDePagoComponidas(),
    rutasDeRetirosComponidas(),
    rutasDeReintegrosComponidas(),
    rutasDeReportesDeSaldosComponidas(),
    rutasDeReportesDeProveedorComponidas(),
    rutasDeReportesDePagosComponidas(),
    rutasDeReportesDeEfectivoComponidas(),
    rutasDeConsultaDePagosComponidas(),
    rutasDePagosEnEfectivoComponidas(),
    respuestaDePagadoAlProveedorComponida(),
    respuestaDeLlavesDeEnlaceComponida(),
    // generador: rutas
  ]),
};
