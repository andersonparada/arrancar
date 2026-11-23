import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { filaConValores, sinValores, valoresDeLaFila } from '../../valores-en-excel.js';
import type { FilaDeInmuebleEnExcel, SolicitudDeInmuebleEnExcel } from '../../valores-en-excel.js';
import type { InmuebleDto } from '../../dto/inmueble.dto.js';
import type { ConsultasInmuebles } from '../../puertos/consultas-inmuebles.js';
import type { ConsultasValoresDeInmueble } from '../../puertos/valores-de-inmueble.js';
import type { CrearInmueble } from './crear-inmueble.js';
import type { RegistrarValorDeInmueble } from './valores/registrar-valor-de-inmueble.js';

/** Los inmuebles con el valor vigente hoy de cada fuente, para exportar a Excel. */
export class ListarInmueblesConValores {
  constructor(
    private readonly dependencias: {
      unidadDeTrabajo: UnidadDeTrabajo;
      consultas: ConsultasInmuebles;
      valores: ConsultasValoresDeInmueble;
      reloj: Reloj;
    },
  ) {}

  ejecutar(operador: Operador): Promise<FilaDeInmuebleEnExcel[]> {
    const { unidadDeTrabajo, consultas, valores, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const vigentes = await valores.vigentes(await reloj.hoy(operador));
      const inmuebles = await consultas.listar();
      return inmuebles.map((inmueble: InmuebleDto) => filaConValores(inmueble, vigentes.get(inmueble.id)));
    });
  }
}

/** Importar una fila: el inmueble y sus valores (de cero a dos) se crean juntos, por los mismos casos de uso del formulario. */
export class CrearInmuebleConValores {
  constructor(
    private readonly dependencias: {
      unidadDeTrabajo: UnidadDeTrabajo;
      crear: CrearInmueble;
      registrarValor: RegistrarValorDeInmueble;
    },
  ) {}

  async ejecutar(operador: Operador, solicitud: SolicitudDeInmuebleEnExcel): Promise<InmuebleDto> {
    const { unidadDeTrabajo, crear, registrarValor } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inmueble = await crear.ejecutar(operador, sinValores(solicitud));
      for (const valor of valoresDeLaFila(solicitud)) {
        await registrarValor.ejecutar(operador, { inmuebleId: inmueble.id, solicitud: valor });
      }
      return inmueble;
    });
  }
}
