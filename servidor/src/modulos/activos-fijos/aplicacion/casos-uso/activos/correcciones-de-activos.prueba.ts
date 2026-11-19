import { describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Clase } from '../../../dominio/clase.js';
import { ActivoInvalido } from '../../../dominio/errores-de-activo.js';
import {
  ActivosEnMemoria,
  CargaInicialDePrueba,
  PrefijoFijo,
  UbicacionesEnMemoria,
} from '../../../pruebas/dobles-de-activos.js';
import { ClasesEnMemoria } from '../../../pruebas/dobles-de-clases.js';
import type { SolicitudDeActivo } from '../../dto/activo.dto.js';
import { CrearActivo } from './crear-activo.js';
import { EditarActivo } from './editar-activo.js';

const operador = operadorDePrueba();

async function armar(reiniciaCadaAnio = false) {
  const clases = new ClasesEnMemoria();
  const clase = Clase.crear(
    Identificador.desde(operador.empresaId),
    {
      nombre: 'Vehículos',
      incisoFiscal: 'maquinaria_y_vehiculos',
      porcentajeFiscal: '20.00',
      vidaUtilContableMeses: null,
      valorResidualPorcentaje: '0.00',
      activo: true,
    },
    { porcentajeMaximo: 20 },
  );
  await clases.agregar(clase);
  const activos = new ActivosEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: activos,
    consultas: activos,
    clases,
    auditoria: new AuditoriaEnMemoria(),
    ubicaciones: new UbicacionesEnMemoria(),
    cargaInicial: new CargaInicialDePrueba(),
    correlativos: new CorrelativosEnMemoria(reiniciaCadaAnio),
    reloj: new RelojFijo('2026-11-18'),
    prefijo: new PrefijoFijo(),
  };
  return { crear: new CrearActivo(dependencias), editar: new EditarActivo(dependencias), clase };
}

const solicitud = (claseId: string, cambios: Partial<SolicitudDeActivo> = {}): SolicitudDeActivo => ({
  codigo: null,
  descripcion: 'Tractor',
  claseId,
  activoPadreId: null,
  tipoDeRegistro: 'bien_de_control',
  origen: 'compra',
  propietario: null,
  formaDeTenencia: null,
  fechaDeAdquisicion: '2026-11-01',
  valorComoGanadoComun: null,
  valorDeMatricula: null,
  valorCatastral: null,
  valoresDelInmuebleCompleto: false,
  marca: null,
  modelo: null,
  numeroDeSerie: null,
  placa: null,
  cantidad: 1,
  observaciones: null,
  localidadId: null,
  departamentoId: null,
  responsable: null,
  enBodega: false,
  ...cambios,
});

describe('correcciones de la revisión de AF-2', () => {
  it('la adquisición futura se rechaza', async () => {
    const { crear, clase } = await armar();

    const intento = crear.ejecutar(operador, solicitud(clase.id.valor, { fechaDeAdquisicion: '2026-11-19' }));

    await expect(intento).rejects.toThrow(ActivoInvalido);
  });

  it('el código propuesto no depende del reinicio anual ni de la fecha', async () => {
    const { crear, clase } = await armar(true);
    const pedir = (cambios: Partial<SolicitudDeActivo>) => crear.ejecutar(operador, solicitud(clase.id.valor, cambios));
    await pedir({ fechaDeAdquisicion: '2026-01-10' });
    await pedir({ codigo: 'AF-0002' });

    const tercero = await pedir({ fechaDeAdquisicion: '2026-02-11' });

    expect(tercero.codigo).toBe('AF-0003');
  });

  it('un activo de una clase inactiva se sigue editando mientras no cambie de clase', async () => {
    const { crear, editar, clase } = await armar();
    const base = solicitud(clase.id.valor);
    const activo = await crear.ejecutar(operador, base);
    clase.cambiarDatos({ ...clase.instantanea(), activo: false }, { porcentajeMaximo: 20 });

    const editado = await editar.ejecutar(operador, { activoId: activo.id, solicitud: { ...base, marca: 'John' } });

    expect(editado.marca).toBe('John');
  });
});
