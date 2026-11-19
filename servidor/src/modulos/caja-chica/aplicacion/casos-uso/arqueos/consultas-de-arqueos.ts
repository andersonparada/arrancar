import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Fondo } from '../../../dominio/fondos.js';
import type { DatosDeLectura } from '../../puertos/puertos-de-fondos.js';
import { DENOMINACIONES_EN_CENTAVOS } from '../../../dominio/conteo-de-efectivo.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import { avisoDeArqueoVencido } from '../../../dominio/reglas-de-arqueos.js';
import type { ArqueoDto, ArqueoResumenDto, PropuestaDeArqueoDto } from '../../dto/arqueos.dto.js';
import { comprobanteDto } from '../comprobantes/armado-del-comprobante.js';
import { custodioVigente, LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { resumenDelArqueo } from './armado-del-arqueo.js';
import type { DependenciasDeArqueos } from './dependencias-de-arqueos.js';
import { LectorDeArqueos } from './lector-de-arqueos.js';

type Dependencias = Pick<
  DependenciasDeArqueos,
  'unidadDeTrabajo' | 'fondos' | 'consultasDeFondos' | 'arqueos' | 'consultas' | 'comprobantes'
>;

/** Los arqueos de un fondo (`fondos.ver`), el más reciente primero. */
export class ListarArqueos {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /** @throws RecursoNoEncontrado si el fondo no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<ArqueoResumenDto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      await this.lector.buscar(fondoId);
      return (await this.dependencias.consultas.delFondo(fondoId)).map(resumenDelArqueo);
    });
  }
}

/** Un arqueo completo, para el acta (`fondos.ver`). */
export class ObtenerArqueo {
  private readonly lector: LectorDeArqueos;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDeArqueos(dependencias);
  }

  /** @throws RecursoNoEncontrado si no existe o su fondo no está asignado al usuario. */
  ejecutar(operador: Operador, arqueoId: string): Promise<ArqueoDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      this.lector.leer(await this.lector.buscar(arqueoId)),
    );
  }
}

/** Lo que el sistema espera hoy en la caja del fondo y lo que se debe ver al contar (`arqueos.crear`). */
export class ProponerArqueo {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: Dependencias & Pick<DependenciasDeArqueos, 'configuracion' | 'reloj'>) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /** @throws RecursoNoEncontrado si el fondo no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<PropuestaDeArqueoDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const fondo = await this.lector.buscar(fondoId);
      const lectura = (await this.dependencias.consultasDeFondos.datosDeLectura([fondoId])).get(fondoId);
      if (!lectura) throw new RecursoNoEncontrado('El fondo');
      return this.armar(operador, { fondo, lectura });
    });
  }

  private async armar(
    operador: Operador,
    por: { fondo: Fondo; lectura: DatosDeLectura },
  ): Promise<PropuestaDeArqueoDto> {
    const { fondo, lectura } = por;
    const { configuracion, reloj, consultas, fondos } = this.dependencias;
    const aviso = avisoDeArqueoVencido({
      fondo,
      ultimoArqueo: lectura.ultimoArqueo,
      hoy: await reloj.hoy(operador),
      diasParaAvisar: await configuracion.diasParaAvisar(operador),
    });
    return {
      fondoId: fondo.id,
      fondoNombre: fondo.nombre,
      custodio: custodioVigente(await fondos.custodios(fondo.id))?.custodio ?? null,
      monto: deCentavos(lectura.montoCentavos),
      pendienteDeReponer: deCentavos(lectura.pendienteCentavos),
      valesAbiertos: deCentavos(lectura.valesCentavos),
      efectivoEsperado: deCentavos(efectivoEsperado(lectura)),
      denominaciones: DENOMINACIONES_EN_CENTAVOS.map(deCentavos),
      pendientes: (await consultas.pendientesDelFondo(fondo.id)).map(comprobanteDto),
      avisos: aviso ? [aviso] : [],
    };
  }
}
