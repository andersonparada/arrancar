import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  ActivoNoEnConstruccion,
  ActivoSinCosto,
  MesCerrado,
  ParametrosDeUsoInvalidos,
  PonerEnUsoVariosInvalido,
} from '../../../dominio/errores-de-depreciacion.js';
import { FechaAnteriorAlUltimoTraslado } from '../../../dominio/errores-de-traslado.js';
import {
  armarTraslados,
  LOCALIDAD_NORTE,
  LOCALIDAD_SUR,
  operador,
  solicitudDeTraslado,
} from '../../../pruebas/escenario-de-traslados.soporte.js';
import type { Activo } from '../../../dominio/activo.js';
import type { SolicitudDePonerEnUsoVarios } from '../../dto/activo.dto.js';

let e: ReturnType<typeof armarTraslados>;

beforeEach(() => {
  e = armarTraslados();
});

const pedido = (activos: readonly Activo[], cambios: Partial<SolicitudDePonerEnUsoVarios> = {}) => ({
  activoIds: activos.map((activo) => activo.id.valor),
  fechaDeInicioDeUso: '2027-03-10',
  ...cambios,
});

const ponerVarios = (solicitud: SolicitudDePonerEnUsoVarios) => e.ponerEnUsoVarios.ejecutar(operador, solicitud);

async function tresTractores(): Promise<Activo[]> {
  return [await e.activo(), await e.activo(), await e.activo()];
}

describe('PonerEnUsoVarios: el lote', () => {
  it('pone en uso todos con la misma fecha y abre los dos tramos de cada uno, y devuelve las fichas en orden', async () => {
    const activos = await tresTractores();

    const fichas = await ponerVarios(pedido([...activos].reverse()));

    expect(fichas.map((ficha) => ficha.id)).toEqual([...activos].reverse().map((activo) => activo.id.valor));
    for (const activo of activos) {
      expect(activo.instantanea()).toMatchObject({ estado: 'en_uso', fechaDeInicioDeUso: '2027-03-10' });
      expect(e.tramosDe(activo).map((tramo) => tramo.libro)).toEqual(['contable', 'fiscal']);
    }
  });

  it('cada activo toma los parámetros de su clase, salvo los que el usuario ajusta por activo', async () => {
    const [uno, dos] = await tresTractores();

    await ponerVarios(
      pedido([uno!, dos!], {
        ajustes: [{ activoId: dos!.id.valor, porcentajeFiscal: '15.00', vidaUtilContableMeses: 48 }],
      }),
    );

    expect(uno!.instantanea()).toMatchObject({ porcentajeFiscal: '20.00', vidaUtilContableMeses: 60 });
    expect(dos!.instantanea()).toMatchObject({ porcentajeFiscal: '15.00', vidaUtilContableMeses: 48 });
  });

  it('rechaza un lote vacío, repetidos, más de 200 y ajustes de un activo que no está', async () => {
    const [uno, dos] = await tresTractores();

    await expect(ponerVarios(pedido([]))).rejects.toBeInstanceOf(PonerEnUsoVariosInvalido);
    await expect(ponerVarios(pedido([uno!, uno!]))).rejects.toBeInstanceOf(PonerEnUsoVariosInvalido);
    const muchos = Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    await expect(ponerVarios({ activoIds: muchos, fechaDeInicioDeUso: '2027-03-10' })).rejects.toBeInstanceOf(
      PonerEnUsoVariosInvalido,
    );
    const ajeno = { activoId: dos!.id.valor, porcentajeFiscal: '10.00' };
    await expect(ponerVarios(pedido([uno!], { ajustes: [ajeno] }))).rejects.toBeInstanceOf(PonerEnUsoVariosInvalido);
    expect(uno!.instantanea().estado).toBe('en_construccion');
  });

  it('un activo que no existe, que ya está en uso o sin costo hace fallar el lote', async () => {
    const [uno, dos, tres] = await tresTractores();
    const enUso = await e.activo({ enUso: true });
    const sinCosto = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), null);

    await expect(ponerVarios({ ...pedido([uno!]), activoIds: [uno!.id.valor, 'otro'] })).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
    await expect(ponerVarios(pedido([enUso, uno!]))).rejects.toBeInstanceOf(ActivoNoEnConstruccion);
    await expect(ponerVarios(pedido([sinCosto, dos!]))).rejects.toBeInstanceOf(ActivoSinCosto);
    const excesivo = { activoId: tres!.id.valor, porcentajeFiscal: '99.00' };
    await expect(ponerVarios(pedido([tres!], { ajustes: [excesivo] }))).rejects.toBeInstanceOf(
      ParametrosDeUsoInvalidos,
    );
  });

  it('rechaza una fecha cuyo primer mes de depreciación ya está cerrado', async () => {
    const activos = await tresTractores();
    e.cierres.ultimoMes = '2027-03-31';

    await expect(ponerVarios(pedido(activos))).rejects.toBeInstanceOf(MesCerrado);
  });
});

describe('PonerEnUsoVarios: ubicación al ponerlos disponibles', () => {
  it('sin responsable quedan en la bodega de activos, en la fila de alta y sin boleta', async () => {
    const activos = await tresTractores();

    await ponerVarios(
      pedido(activos, { ubicacion: { localidadId: LOCALIDAD_NORTE, departamentoId: null, responsable: null } }),
    );

    for (const activo of activos)
      expect(activo.instantanea()).toMatchObject({ localidadId: LOCALIDAD_NORTE, enBodega: true, responsable: null });
    expect(e.traslados.filas.every((fila) => fila.traslado === null)).toBe(true);
    expect(e.publicador.publicados).toHaveLength(0);
  });

  it('con responsable no quedan en la bodega, salvo que se marque la casilla', async () => {
    const [uno, dos] = await tresTractores();
    const ubicacion = { localidadId: LOCALIDAD_SUR, departamentoId: null, responsable: ' Juan Pérez ' };

    await ponerVarios(pedido([uno!], { ubicacion }));
    await ponerVarios(pedido([dos!], { ubicacion: { ...ubicacion, enBodega: true } }));

    expect(uno!.instantanea()).toMatchObject({ responsable: 'Juan Pérez', enBodega: false });
    expect(dos!.instantanea()).toMatchObject({ responsable: 'Juan Pérez', enBodega: true });
  });

  it('sin ubicación conservan la que tenían', async () => {
    const [uno] = await tresTractores();

    await ponerVarios(pedido([uno!]));

    expect(uno!.instantanea()).toMatchObject({ localidadId: null, enBodega: false });
  });

  it('el que ya tuvo traslados recibe uno con boleta («Disponible para uso»); los demás, solo la fila de alta', async () => {
    const [trasladado, nuevo] = await tresTractores();
    await e.trasladar(solicitudDeTraslado([trasladado!], { fecha: '2027-03-01' }));
    e.publicador.publicados.length = 0;

    await ponerVarios(
      pedido([trasladado!, nuevo!], {
        ubicacion: { localidadId: LOCALIDAD_NORTE, departamentoId: null, responsable: null },
      }),
    );

    const traslados = e.traslados.filas.flatMap((fila) => (fila.traslado ? [fila.traslado.instantanea()] : []));
    const ultimo = traslados.at(-1)!;
    expect(traslados).toHaveLength(2);
    expect(ultimo).toMatchObject({ motivo: 'Disponible para uso', recibidoPor: 'Bodega de activos', aBodega: true });
    expect(ultimo.activoId).toBe(trasladado!.id.valor);
    expect(trasladado!.instantanea()).toMatchObject({ localidadId: LOCALIDAD_NORTE, enBodega: true });
    expect(nuevo!.instantanea()).toMatchObject({ localidadId: LOCALIDAD_NORTE, enBodega: true });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.activo_trasladado']);
  });

  it('el traslado no puede ser anterior al último traslado del activo', async () => {
    const [trasladado] = await tresTractores();
    await e.trasladar(solicitudDeTraslado([trasladado!], { fecha: '2027-03-20' }));

    await expect(
      ponerVarios(
        pedido([trasladado!], { ubicacion: { localidadId: LOCALIDAD_SUR, departamentoId: null, responsable: null } }),
      ),
    ).rejects.toBeInstanceOf(FechaAnteriorAlUltimoTraslado);
  });

  it('sin cambio de ubicación no deja traslado', async () => {
    const [trasladado] = await tresTractores();
    await e.trasladar(solicitudDeTraslado([trasladado!], { fecha: '2027-03-01', responsable: null }));
    const antes = e.traslados.filas.length;

    await ponerVarios(
      pedido([trasladado!], {
        ubicacion: { localidadId: LOCALIDAD_NORTE, departamentoId: null, responsable: null, enBodega: false },
      }),
    );

    expect(e.traslados.filas).toHaveLength(antes);
  });
});
