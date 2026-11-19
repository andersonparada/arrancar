import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasContactos, ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: Pick<RepositorioTerceros, 'buscarDeProveedor'>;
  consultas: Pick<ConsultasTerceros, 'obtener'>;
  contactos: Pick<ConsultasContactos, 'listarDeTercero'>;
}

export interface CorreosDeProveedor {
  terceroId: string;
  nombre: string;
  correo: string | null;
  contactos: Array<{ id: string; nombre: string; correo: string | null; recibeAvisosDePago: boolean }>;
}

/**
 * Atiende la orden `terceros.obtener_correos_de_proveedor`: Cuentas por pagar la manda para saber a quién avisarle de un
 * pago. Solo lee, con la cuenta del operador (RLS), así que un proveedor de otra cuenta no existe. El permiso lo exige
 * la ruta que origina.
 */
export class ObtenerCorreosDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el proveedor no existe en la cuenta. */
  ejecutar(operador: Operador, proveedorId: string): Promise<CorreosDeProveedor> {
    const { unidadDeTrabajo, repositorio, consultas, contactos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await repositorio.buscarDeProveedor(proveedorId);
      if (!tercero) throw new RecursoNoEncontrado('El proveedor');
      const terceroId = tercero.id.valor;
      const [datos, personas] = await Promise.all([consultas.obtener(terceroId), contactos.listarDeTercero(terceroId)]);
      return {
        terceroId,
        nombre: datos.nombreMostrar,
        correo: datos.correo ?? null,
        contactos: personas.map(({ id, nombre, correo, recibeAvisosDePago }) => ({
          id,
          nombre,
          correo,
          recibeAvisosDePago,
        })),
      };
    });
  }
}
