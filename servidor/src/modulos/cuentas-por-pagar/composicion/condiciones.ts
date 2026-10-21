import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { GuardarCondicionesDeProveedor } from '../aplicacion/casos-uso/condiciones/guardar-condiciones-de-proveedor.js';
import { ObtenerCondicionesDeProveedor } from '../aplicacion/casos-uso/condiciones/obtener-condiciones-de-proveedor.js';
import { CondicionesControlador } from '../http/condiciones.controlador.js';
import { seccionDeCondiciones } from '../http/condiciones.esquemas-http.js';
import { rutasDeCondiciones } from '../http/condiciones.rutas.js';
import { CondicionesDeProveedoresDrizzle } from '../infraestructura/persistencia/condiciones-de-proveedores.drizzle.js';

/**
 * Raíz de composición de las condiciones de pago de los proveedores. Este módulo aporta su sección al formulario de
 * Proveedores: cuando Terceros avisa que guardó, valida y guarda la suya en la misma transacción (una sección inválida
 * deshace todo el formulario). Devuelve la ruta de lectura.
 */
export function rutasDeCondicionesComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const condiciones = new CondicionesDeProveedoresDrizzle();
  const guardar = new GuardarCondicionesDeProveedor({ unidadDeTrabajo, condiciones });
  mediador.escuchar(
    'cuentas-por-pagar',
    'terceros.proveedor_guardado',
    async ({ proveedorId, secciones }, operador) => {
      const cambio = seccionDeCondiciones(secciones);
      if (cambio) await guardar.ejecutar(operador, proveedorId, cambio);
    },
  );
  return rutasDeCondiciones(
    new CondicionesControlador(new ObtenerCondicionesDeProveedor({ unidadDeTrabajo, condiciones })),
  );
}
