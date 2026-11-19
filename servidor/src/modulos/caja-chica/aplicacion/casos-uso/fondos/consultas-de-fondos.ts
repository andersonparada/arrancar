import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { avisoDeArqueoVencido } from '../../../dominio/reglas-de-arqueos.js';
import type { Fondo } from '../../../dominio/fondos.js';
import type { FondoDto, FondoResumenDto, PaginaDeFondosDto } from '../../dto/fondos.dto.js';
import type { FiltroDeFondos } from '../../puertos/puertos-de-fondos.js';
import { resumenDelFondo } from './armado-del-fondo.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';

type DependenciasDeAvisos = Pick<DependenciasDeFondos, 'reloj' | 'configuracionDeArqueos'>;

/** Suma a la fila o la ficha el aviso «sin arqueo», si toca (`caja-chica.arqueos.dias_para_avisar`). */
async function conAvisoDeArqueo<T extends FondoResumenDto>(
  { reloj, configuracionDeArqueos }: DependenciasDeAvisos,
  por: { operador: Operador; fondo: Fondo; fila: T },
): Promise<T> {
  const { operador, fondo, fila } = por;
  const aviso = avisoDeArqueoVencido({
    fondo,
    ultimoArqueo: fila.ultimoArqueo,
    hoy: await reloj.hoy(operador),
    diasParaAvisar: await configuracionDeArqueos.diasParaAvisar(operador),
  });
  return aviso ? { ...fila, avisos: [...fila.avisos, aviso] } : fila;
}

/** La lista de los fondos que ve el usuario (`fondos.ver`), con sus cifras; por omisión los abiertos. */
export class ListarFondos {
  constructor(
    private readonly dependencias: Pick<DependenciasDeFondos, 'unidadDeTrabajo' | 'consultas'> & DependenciasDeAvisos,
  ) {}

  ejecutar(operador: Operador, filtro: FiltroDeFondos): Promise<PaginaDeFondosDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { filas, total } = await consultas.listar(filtro);
      const lecturas = await consultas.datosDeLectura(filas.map(({ id }) => id));
      const elementos = await Promise.all(
        filas.flatMap((fondo) => {
          const lectura = lecturas.get(fondo.id);
          const fila = lectura && resumenDelFondo(fondo, lectura);
          return fila ? [conAvisoDeArqueo(this.dependencias, { operador, fondo, fila })] : [];
        }),
      );
      return { elementos, total };
    });
  }
}

/** La ficha de un fondo con su historial de custodios y de cambios de monto (`fondos.ver`). */
export class ObtenerFondo {
  private readonly lector: LectorDelFondo;

  constructor(
    private readonly dependencias: Pick<DependenciasDeFondos, 'unidadDeTrabajo' | 'fondos' | 'consultas'> &
      DependenciasDeAvisos,
  ) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /** @throws RecursoNoEncontrado si no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<FondoDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const fondo = await this.lector.buscar(fondoId);
      return conAvisoDeArqueo(this.dependencias, { operador, fondo, fila: await this.lector.leer(fondo) });
    });
  }
}
