import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DependenciasDeArticulos } from './dependencias-de-articulos.js';

const CLAVE_DE_ARTICULOS = 'inventarios.articulos';
const INTENTOS = 50;
const DIGITOS = 4;

/** Propone el código del próximo artículo: el prefijo de la empresa y el correlativo, sin repetir uno que ya exista. */
export class ProponerCodigoDeArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /**
   * El número consumido no se devuelve si el código no se usa: la numeración puede tener huecos, y el código es
   * editable. Nunca propone un código que ya tenga otro artículo.
   */
  ejecutar(operador: Operador): Promise<{ codigo: string }> {
    const { unidadDeTrabajo, consultas, correlativos, prefijo, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inicio = await prefijo.paraEmpresa(operador);
      const hoy = await reloj.hoy(operador);
      for (let intento = 0; intento < INTENTOS; intento++) {
        const { numero } = await correlativos.siguiente(CLAVE_DE_ARTICULOS, hoy);
        const codigo = `${inicio}${String(numero).padStart(DIGITOS, '0')}`;
        if (!(await consultas.existeCodigo(codigo))) return { codigo };
      }
      throw new Error('No se pudo proponer un código libre para el artículo.');
    });
  }
}
