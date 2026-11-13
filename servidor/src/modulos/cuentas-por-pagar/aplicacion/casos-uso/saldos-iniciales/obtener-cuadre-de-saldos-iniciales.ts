import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type {
  CuadreDeProveedorDto,
  CuadreDeSaldosInicialesDto,
  TotalesDelCuadreDto,
} from '../../dto/cuadre-de-saldos-iniciales.dto.js';
import type { ConsultasDeCuadre, SumasDeProveedorEnElCuadre } from '../../puertos/puertos-de-cuadre.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';

export interface DependenciasDelCuadre {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeCuadre;
  cargaInicial: CargaInicial;
}

type Sumas = Pick<
  SumasDeProveedorEnElCuadre,
  'documentos' | 'cargosCentavos' | 'notasAFavorCentavos' | 'retencionesPorPracticarCentavos'
>;

function totalesDe(sumas: Sumas): TotalesDelCuadreDto {
  return {
    documentos: sumas.documentos,
    cargos: deCentavos(sumas.cargosCentavos),
    notasAFavor: deCentavos(sumas.notasAFavorCentavos),
    neto: deCentavos(sumas.cargosCentavos - sumas.notasAFavorCentavos),
    retencionesPorPracticar: deCentavos(sumas.retencionesPorPracticarCentavos),
  };
}

function sumarTodos(filas: Sumas[]): Sumas {
  const cero = { documentos: 0, cargosCentavos: 0, notasAFavorCentavos: 0, retencionesPorPracticarCentavos: 0 };
  return filas.reduce(
    (total, fila) => ({
      documentos: total.documentos + fila.documentos,
      cargosCentavos: total.cargosCentavos + fila.cargosCentavos,
      notasAFavorCentavos: total.notasAFavorCentavos + fila.notasAFavorCentavos,
      retencionesPorPracticarCentavos: total.retencionesPorPracticarCentavos + fila.retencionesPorPracticarCentavos,
    }),
    cero,
  );
}

/**
 * El cuadre de los saldos iniciales: por proveedor y general, con cargos, notas a favor, neto y retenciones por
 * practicar separados. Suma lo que faltaba pagar en la fecha de inicio, no el saldo de hoy.
 */
export class ObtenerCuadreDeSaldosIniciales {
  constructor(private readonly dependencias: DependenciasDelCuadre) {}

  ejecutar(operador: Operador): Promise<CuadreDeSaldosInicialesDto> {
    const { unidadDeTrabajo, consultas, cargaInicial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const carga = await cargaInicial.obtener(operador);
      const filas = await consultas.sumasPorProveedor();
      const proveedores: CuadreDeProveedorDto[] = filas.map((fila) => ({
        proveedorId: fila.proveedorId,
        proveedorNombre: fila.proveedorNombre,
        proveedorNit: fila.proveedorNit,
        ...totalesDe(fila),
      }));
      return { carga, proveedores, general: totalesDe(sumarTodos(filas)) };
    });
  }
}
