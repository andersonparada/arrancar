import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { EmpresaDeLaImpresion } from '../puertos/puertos-de-impresion-de-contrasenas.js';
import type { CargoDeContrasenaDto, ContrasenaDto, NotaDeContrasenaDto } from './contrasena.dto.js';
import type {
  CargoImpresoDto,
  CompensacionImpresaDto,
  HojaDeImpresionDto,
  ImpresionDeContrasenaDto,
  RetencionPorEmitirImpresaDto,
} from './impresion-de-contrasena.dto.js';

/** Lo que no sale de la contraseña: la empresa, la leyenda, cuándo y quién imprime, y si es reimpresión. */
export interface ExtrasDeImpresion {
  empresa: EmpresaDeLaImpresion;
  leyenda: string;
  hoy: string;
  impresoPorNombre: string | null;
  impresoEn: string;
  reimpresion: boolean;
}

const LEYENDA_DE_RETENCIONES = 'Las retenciones se documentan con su constancia.';

const HOJAS: HojaDeImpresionDto[] = [
  { rotulo: 'ORIGINAL — PROVEEDOR', firmaElProveedor: false },
  { rotulo: 'COPIA — EMPRESA', firmaElProveedor: true },
];

const numeroConSerie = (serie: string | null, numero: string) => (serie ? `${serie}-${numero}` : numero);

const dtoDeCargoImpreso = (cargo: CargoDeContrasenaDto): CargoImpresoDto => ({
  documentoId: cargo.documentoId,
  tipo: cargo.tipo,
  serie: cargo.serie,
  numero: cargo.numero,
  fechaEmision: cargo.fechaEmision,
  total: cargo.total,
  retenciones: cargo.retenciones,
  rebajado: cargo.rebajado,
  saldo: cargo.saldo,
});

const dtoDeCompensacion = (nota: NotaDeContrasenaDto): CompensacionImpresaDto => ({
  documentoId: nota.documentoId,
  serie: nota.serie,
  numero: nota.numero,
  fechaEmision: nota.fechaEmision,
  monto: nota.aplicadoEnLaContrasena,
  texto: `Compensación con nota ${numeroConSerie(nota.serie, nota.numero)} (saldo a favor)`,
});

const porEmitirDe = (cargo: CargoDeContrasenaDto): number => aCentavos(cargo.retencionesPorPracticar ?? '0');

/** Las retenciones por practicar de los saldos iniciales: «por emitir», sin restarlas otra vez del saldo. */
function retencionesPorEmitirDe(cargos: readonly CargoDeContrasenaDto[]): RetencionPorEmitirImpresaDto[] {
  return cargos
    .filter((cargo) => porEmitirDe(cargo) > 0)
    .map((cargo) => ({
      documentoId: cargo.documentoId,
      monto: cargo.retencionesPorPracticar!,
      texto: `Retención por emitir: Q${cargo.retencionesPorPracticar}; se entregará su constancia`,
    }));
}

const tieneRetenciones = (cargo: CargoDeContrasenaDto) => aCentavos(cargo.retenciones) > 0 || porEmitirDe(cargo) > 0;

const datosDeLaContrasena = (c: ContrasenaDto): ImpresionDeContrasenaDto['contrasena'] => ({
  id: c.id,
  numero: c.numero,
  fecha: c.fecha,
  fechaDePago: c.fechaDePago,
  observaciones: c.observaciones,
  estado: c.estado,
});

/** La contraseña de hoy armada como va en el papel: lo fijo, lo vivo al día de la impresión y las leyendas. */
export function dtoDeImpresionDeContrasena(
  contrasena: ContrasenaDto,
  extras: ExtrasDeImpresion,
): ImpresionDeContrasenaDto {
  const hayRetenciones = contrasena.cargos.some(tieneRetenciones);
  const leyenda = extras.leyenda.trim();
  return {
    empresa: extras.empresa,
    contrasena: datosDeLaContrasena(contrasena),
    proveedor: { nombre: contrasena.proveedorNombre, nit: contrasena.proveedorNit },
    hojas: HOJAS,
    cargos: contrasena.cargos.map(dtoDeCargoImpreso),
    totales: contrasena.totales,
    compensaciones: contrasena.notas.map(dtoDeCompensacion),
    retencionesPorEmitir: retencionesPorEmitirDe(contrasena.cargos),
    hayRetenciones,
    leyendaDeRetenciones: hayRetenciones ? LEYENDA_DE_RETENCIONES : null,
    leyenda: leyenda === '' ? null : leyenda,
    alDia: extras.hoy,
    reimpresion: extras.reimpresion,
    impresoPorNombre: extras.impresoPorNombre,
    impresoEn: extras.impresoEn,
    anulacion: contrasena.anulacion,
  };
}
