import type {
  CifraDelCuadre,
  HallazgoDeCierre,
  RevisionDeCierreDeModulo,
} from '../../../../core/contratos/empresas.contratos.js';
import { MAXIMO_DE_CIFRAS_POR_MODULO } from '../../../../core/contratos/empresas.contratos.js';
import { deCentavosEnteros } from '../../../dominio/decimales.js';
import type { TipoDeInventario } from '../../../dominio/tipos-de-inventario.js';
import type {
  ExistenciaDeSaldoInicial,
  ResumenDeSaldosIniciales,
} from '../../puertos/consultas-de-saldos-iniciales.js';

const NOMBRE_DEL_TIPO: Record<TipoDeInventario, string> = {
  mercaderia: 'Mercadería',
  materia_prima: 'Materia prima',
  suministros: 'Suministros',
  producto_en_proceso: 'Producto en proceso',
  producto_terminado: 'Producto terminado',
  repuestos: 'Repuestos',
  empaques: 'Empaques',
};

const monto = (centavos: bigint): string => deCentavosEnteros(centavos);

const quetzales = (centavos: bigint): string => {
  const [enteros = '0', decimales = '00'] = monto(centavos).split('.');
  return `Q${enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
};

const fechaLegible = (fecha: string): string => fecha.split('-').reverse().join('/');

const plural = (cantidad: number, singular: string, pluralDe: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;

const aviso = (codigo: string, mensaje: string): HallazgoDeCierre => ({
  codigo,
  nivel: 'aviso',
  mensaje,
  registro: null,
});

/** Lo que cada artículo tiene en toda la empresa por sus saldos iniciales (suma de sus bodegas). */
function porArticulo(existencias: readonly ExistenciaDeSaldoInicial[]) {
  const suma = new Map<string, { cantidad: bigint; valor: bigint }>();
  for (const fila of existencias) {
    const antes = suma.get(fila.articuloId) ?? { cantidad: 0n, valor: 0n };
    suma.set(fila.articuloId, { cantidad: antes.cantidad + fila.cantidad, valor: antes.valor + fila.valor });
  }
  return suma;
}

interface Contexto {
  resumen: ResumenDeSaldosIniciales;
  corte: string;
  hayConteos: boolean;
}

function sinCosto(existencias: readonly ExistenciaDeSaldoInicial[]): HallazgoDeCierre[] {
  const cuantos = [...porArticulo(existencias).values()].filter((a) => a.cantidad > 0n && a.valor === 0n).length;
  if (cuantos === 0) return [];
  const mensaje = `${plural(cuantos, 'artículo tiene', 'artículos tienen')} existencia con costo cero: revise su costo.`;
  return [aviso('existencias_sin_costo', mensaje)];
}

function lotesVencidos({ resumen, corte }: Contexto): HallazgoDeCierre[] {
  const { lotes, valor } = resumen.lotesVencidos;
  if (lotes === 0) return [];
  const cuantos = plural(
    lotes,
    'lote de saldo inicial ya estaba vencido',
    'lotes de saldo inicial ya estaban vencidos',
  );
  const mensaje = `${cuantos} al ${fechaLegible(corte)} por ${quetzales(valor)}: considere el deterioro.`;
  return [aviso('lotes_vencidos', mensaje)];
}

function sinConteo({ hayConteos }: Contexto): HallazgoDeCierre[] {
  if (hayConteos) return [];
  const mensaje = 'El saldo inicial no tiene un inventario físico que lo respalde; levante uno al empezar.';
  return [aviso('sin_conteo_de_respaldo', mensaje)];
}

function hallazgosDelCierre(contexto: Contexto): HallazgoDeCierre[] {
  const { existencias } = contexto.resumen;
  if (existencias.length === 0) {
    const corte = fechaLegible(contexto.corte);
    const mensaje = `No hay existencias de saldo inicial. Si la empresa tenía inventario al ${corte}, cárguelo antes de cerrar.`;
    return [aviso('sin_saldos_iniciales', mensaje)];
  }
  return [...sinCosto(existencias), ...lotesVencidos(contexto), ...sinConteo(contexto)];
}

const cifra = (
  datos: Omit<CifraDelCuadre, 'registro'> & { registro?: CifraDelCuadre['registro'] },
): CifraDelCuadre => ({
  registro: null,
  ...datos,
});

function cifrasPorTipo(existencias: readonly ExistenciaDeSaldoInicial[]): CifraDelCuadre[] {
  const valores = new Map<TipoDeInventario, bigint>();
  for (const fila of existencias)
    valores.set(fila.tipoDeInventario, (valores.get(fila.tipoDeInventario) ?? 0n) + fila.valor);
  return [...valores].map(([tipo, valor]) =>
    cifra({
      clave: 'valor_por_tipo',
      etiqueta: `Valor del inventario: ${NOMBRE_DEL_TIPO[tipo]}`,
      tipo: 'monto',
      valor: monto(valor),
      registro: { id: tipo, nombre: NOMBRE_DEL_TIPO[tipo] },
    }),
  );
}

function cifrasPorBodega(existencias: readonly ExistenciaDeSaldoInicial[], cupo: number): CifraDelCuadre[] {
  const valores = new Map<string, { nombre: string; valor: bigint }>();
  for (const fila of existencias) {
    const antes = valores.get(fila.bodegaId) ?? { nombre: fila.bodegaNombre, valor: 0n };
    valores.set(fila.bodegaId, { nombre: antes.nombre, valor: antes.valor + fila.valor });
  }
  return [...valores].slice(0, cupo).map(([id, { nombre, valor }]) =>
    cifra({
      clave: 'valor_por_bodega',
      etiqueta: `Valor del inventario en la bodega ${nombre}`,
      tipo: 'monto',
      valor: monto(valor),
      registro: { id, nombre },
    }),
  );
}

function cifrasDelCierre(existencias: readonly ExistenciaDeSaldoInicial[]): CifraDelCuadre[] {
  const conExistencia = [...porArticulo(existencias).values()].filter((a) => a.cantidad > 0n);
  const total = existencias.reduce((suma, fila) => suma + fila.valor, 0n);
  const generales = [
    cifra({
      clave: 'articulos_con_existencia',
      etiqueta: 'Artículos con existencia',
      tipo: 'cantidad',
      valor: String(conExistencia.length),
    }),
    cifra({ clave: 'valor_del_inventario', etiqueta: 'Valor del inventario', tipo: 'monto', valor: monto(total) }),
  ];
  const porTipo = cifrasPorTipo(existencias);
  const cupo = MAXIMO_DE_CIFRAS_POR_MODULO - generales.length - porTipo.length;
  return [...generales, ...porTipo, ...cifrasPorBodega(existencias, cupo)];
}

/** La revisión de Inventarios al cerrar la carga inicial (§8): avisos, cifras del cuadre y el resumen de lo cargado. */
export function revisionDeCierreDeInventarios(contexto: Contexto): RevisionDeCierreDeModulo {
  const { existencias } = contexto.resumen;
  const articulos = [...porArticulo(existencias).values()].filter((a) => a.cantidad > 0n).length;
  const bodegas = new Set(existencias.map((fila) => fila.bodegaId)).size;
  const total = existencias.reduce((suma, fila) => suma + fila.valor, 0n);
  return {
    nombreDelModulo: 'Inventarios',
    resumen:
      existencias.length === 0
        ? null
        : `${plural(articulos, 'artículo', 'artículos')} por ${quetzales(total)} en ${plural(bodegas, 'bodega', 'bodegas')} al ${fechaLegible(contexto.corte)}`,
    ruta: '/inventarios/saldos-iniciales',
    hallazgos: hallazgosDelCierre(contexto),
    cifras: cifrasDelCierre(existencias),
  };
}
