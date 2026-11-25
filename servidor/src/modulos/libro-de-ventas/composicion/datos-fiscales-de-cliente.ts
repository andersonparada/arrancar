import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { GuardarDatosFiscalesDeCliente } from '../aplicacion/casos-uso/datos-fiscales/guardar-datos-fiscales-de-cliente.js';
import { ObtenerDatosFiscalesDeCliente } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-cliente.js';
import { DatosFiscalesDeClienteControlador } from '../http/datos-fiscales-de-cliente.controlador.js';
import { seccionFiscalDeCliente } from '../http/datos-fiscales-de-cliente.esquemas-http.js';
import { rutasDeDatosFiscalesDeCliente } from '../http/datos-fiscales-de-cliente.rutas.js';
import { RepositorioDeDatosFiscalesDeClienteDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales-de-cliente.drizzle.js';

const MODULO = 'libro-de-ventas';

/**
 * Este módulo aporta su sección al formulario de Clientes: cuando Terceros avisa que guardó un cliente, valida y
 * guarda la suya en la misma transacción. Una sección inválida deshace todo el formulario.
 */
function escucharElFormulario(guardar: GuardarDatosFiscalesDeCliente): void {
  mediador.escuchar(MODULO, 'terceros.cliente_guardado', async ({ clienteId, secciones }, operador) => {
    const datos = seccionFiscalDeCliente(secciones);
    if (datos) await guardar.ejecutar(operador, { clienteId, datos });
  });
}

/** Raíz de composición de los datos fiscales del cliente: devuelve su ruta y registra su escucha. */
export function rutasDeDatosFiscalesDeClienteComponidas() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const repositorio = new RepositorioDeDatosFiscalesDeClienteDrizzle();
  escucharElFormulario(new GuardarDatosFiscalesDeCliente({ unidadDeTrabajo, repositorio, auditoria }));
  const obtener = new ObtenerDatosFiscalesDeCliente({ unidadDeTrabajo, repositorio });
  return rutasDeDatosFiscalesDeCliente(new DatosFiscalesDeClienteControlador(obtener));
}
