import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ContactoEncontradoDto } from '../../dto/contacto.dto.js';
import type { BusquedaDeContactos } from '../../puertos/consultas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  busqueda: BusquedaDeContactos;
}

/** Suficientes para encontrar a quién llamar; si hay más, conviene escribir más letras. */
const RESULTADOS_A_MOSTRAR = 50;

/** "Buscar contacto": a quién llamar o escribir, entre clientes, proveedores y sus contactos. */
export class BuscarContactos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, texto: string): Promise<ContactoEncontradoDto[]> {
    const { unidadDeTrabajo, busqueda } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => busqueda.buscar(texto, RESULTADOS_A_MOSTRAR));
  }
}
