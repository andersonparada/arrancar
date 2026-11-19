/** Cierre mensual de depreciación (AF-5): revisar, cerrar en orden y sin duplicar, reabrir, concurrencia, permisos y aislamiento. */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';

const RUTA = '/api/activos-fijos/activos';
const DEPRECIACION = '/api/activos-fijos/depreciacion';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let vehiculosId: string;
let grande: string;
let chico: string;
let tercero: string;

/** Un activo en construcción con un costo manual y, si se da la fecha, puesto en uso. */
async function activoEnUso(monto: string, fechaDeUso: string | null): Promise<string> {
  const creado = await cuenta.propietario.post(RUTA, datosDeActivo(vehiculosId, { fechaDeAdquisicion: '2026-09-01' }));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  const costo = await cuenta.propietario.post(`${RUTA}/${id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto,
    documentoDeSoporte: 'Escritura 15',
  });
  expect(costo.estado).toBe(201);
  if (fechaDeUso) {
    const puesto = await cuenta.propietario.post(`${RUTA}/${id}/poner-en-uso`, { fechaDeInicioDeUso: fechaDeUso });
    expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  }
  return id;
}

const revisar = (periodo: string, quien = cuenta.propietario) => quien.get(`${DEPRECIACION}/${periodo}/revision`);
const cerrar = (periodo: string, cuerpo: Record<string, unknown> = {}, quien = cuenta.propietario) =>
  quien.post(`${DEPRECIACION}/${periodo}/cerrar`, cuerpo);
const reabrir = (periodo: string, motivo = 'Falta un costo del flete') =>
  cuenta.propietario.post(`${DEPRECIACION}/${periodo}/reabrir`, { motivo });

const cuotasVigentes = (periodo: string) =>
  comoPropietario<{ libro: string; monto: string; acumulada: string }>(
    `select c.libro, c.monto, c.acumulada from activos_fijos.cuotas c
       join core.empresas e on e.id = c.empresa_id
      where e.cuenta_id = $1 and c.periodo = $2 and c.vigente order by c.activo_id, c.libro`,
    [cuenta.cuentaId, periodo],
  );

const auditoria = (accion: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; motivo: string | null }>(
    `select a.anterior, a.motivo from core.auditoria a join core.empresas e on e.id = a.empresa_id
      where e.cuenta_id = $1 and a.recurso = 'activos-fijos.cierres' and a.accion = $2 order by a.creado_en`,
    [cuenta.cuentaId, accion],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Cierres', usuario: 'propietariocierres', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Cierres ajena', usuario: 'propietariocierresajeno', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
});

describe('sin activos en uso', () => {
  it('no hay mes por cerrar: la lista lo dice y revisar o cerrar se rechazan', async () => {
    const lista = await cuenta.propietario.get(DEPRECIACION);
    const revision = await revisar('2026-09-01');
    const cierre = await cerrar('2026-09-01');

    expect(lista.cuerpo).toEqual({ siguienteMes: null, cierres: [] });
    expect([revision.estado, cierre.estado]).toEqual([422, 422]);
    expect(revision.cuerpo.error.codigo).toBe('sin_mes_por_cerrar');
  });

  it('el período debe ser el primer día de un mes', async () => {
    expect((await revisar('2026-09-15')).estado).toBe(400);
    expect((await cerrar('2026-13-01')).estado).toBe(400);
  });
});

describe('revisar y cerrar el primer mes', () => {
  beforeAll(async () => {
    grande = await activoEnUso('250000.00', '2026-09-10');
    chico = await activoEnUso('12000.00', '2026-09-10');
    const ocioso = await cuenta.propietario.post(`${RUTA}/${chico}/ocioso`, {
      ocioso: true,
      fecha: '2026-09-12',
      motivo: 'Sin operador',
    });
    expect(ocioso.estado, JSON.stringify(ocioso.cuerpo)).toBe(200);
  });

  it('la revisión da los totales y avisa de activos sin localidad y de ociosos con cuota fiscal', async () => {
    const lista = await cuenta.propietario.get(DEPRECIACION);
    const revision = await revisar('2026-09-01');

    expect(lista.cuerpo.siguienteMes).toBe('2026-09-01');
    expect(revision.estado, JSON.stringify(revision.cuerpo)).toBe(200);
    expect(revision.cuerpo).toMatchObject({
      periodo: '2026-09-01',
      puedeCerrar: true,
      totales: { contable: '4366.67', fiscal: '4366.67', activosDepreciados: 2 },
    });
    const codigos = revision.cuerpo.hallazgos.map((h: { codigo: string }) => h.codigo);
    expect(codigos).toEqual(['activos_sin_localidad', 'ociosos_con_cuota_fiscal']);
    expect(revision.cuerpo.hallazgos[1]).toMatchObject({ nivel: 'aviso', cantidad: 1 });
    expect(await cuotasVigentes('2026-09-01')).toHaveLength(0);
  });

  it('un mes posterior al siguiente o al mes en curso solo muestra que primero hay que cerrar el anterior', async () => {
    const revision = await revisar('2026-10-01');

    expect(revision.cuerpo.puedeCerrar).toBe(false);
    expect(revision.cuerpo.hallazgos.map((h: { codigo: string }) => h.codigo)).toEqual(['mes_anterior_sin_cerrar']);
    const cierre = await cerrar('2026-10-01');
    expect([cierre.estado, cierre.cuerpo.error.codigo]).toEqual([422, 'mes_anterior_sin_cerrar']);
    expect(cierre.cuerpo.error.detalles).toEqual({ siguiente: '2026-09-01' });
    const futuro = (await revisar('2099-01-01')).cuerpo.hallazgos.map((h: { codigo: string }) => h.codigo);
    expect(futuro).toEqual(['mes_por_llegar']);
    expect((await cerrar('2099-01-01')).cuerpo.error).toMatchObject({ codigo: 'mes_por_llegar' });
  });

  it('cierra con la huella: guarda una cuota por activo y libro y deja constancia en la auditoría', async () => {
    const { cuerpo: revision } = await revisar('2026-09-01');

    const cierre = await cerrar('2026-09-01', { huella: revision.huella });

    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(cierre.cuerpo).toMatchObject({
      periodo: '2026-09-01',
      estado: 'cerrado',
      totalContable: '4366.67',
      totalFiscal: '4366.67',
      activosDepreciados: 2,
    });
    const cuotas = await cuotasVigentes('2026-09-01');
    expect(cuotas).toHaveLength(4);
    expect(cuotas.map((c) => c.monto).sort()).toEqual(['200.00', '200.00', '4166.67', '4166.67']);
    expect(cuotas.every((c) => c.monto === c.acumulada)).toBe(true);
    const filas = await auditoria('cerrar');
    expect(filas[0]!.anterior).toMatchObject({ periodo: '2026-09-01', contable: '4366.67', fiscal: '4366.67' });
    const lista = await cuenta.propietario.get(DEPRECIACION);
    expect(lista.cuerpo.siguienteMes).toBe('2026-10-01');
    expect(lista.cuerpo.cierres).toHaveLength(1);
  });

  it('cerrar el mismo mes otra vez se rechaza y no duplica nada', async () => {
    const otra = await cerrar('2026-09-01');
    const revision = await revisar('2026-09-01');

    expect(otra.estado).toBe(422);
    expect(otra.cuerpo.error.codigo).toBe('mes_cerrado');
    expect(revision.cuerpo.error.codigo).toBe('mes_cerrado');
    expect(await cuotasVigentes('2026-09-01')).toHaveLength(4);
    expect(await auditoria('cerrar')).toHaveLength(1);
  });

  it('la base no deja dos cuotas vigentes del mismo activo, libro y mes', async () => {
    const duplicar = comoPropietario(
      `insert into activos_fijos.cuotas (empresa_id, periodo, activo_id, libro, tramo_id, monto, acumulada)
         select c.empresa_id, c.periodo, c.activo_id, c.libro, c.tramo_id, c.monto, c.acumulada
           from activos_fijos.cuotas c join core.empresas e on e.id = c.empresa_id
          where e.cuenta_id = $1 and c.vigente limit 1`,
      [cuenta.cuentaId],
    );

    await expect(duplicar).rejects.toMatchObject({ constraint: 'cuotas_vigente_unica' });
  });

  it('con un mes cerrado, poner en uso con fecha de ese mes se rechaza, y quitar de uso un activo con cuotas también', async () => {
    const nuevo = await activoEnUso('1000.00', null);

    const poner = await cuenta.propietario.post(`${RUTA}/${nuevo}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-20' });
    const quitar = await cuenta.propietario.post(`${RUTA}/${grande}/quitar-de-uso`);

    expect(poner.estado).toBe(422);
    expect(poner.cuerpo.error.codigo).toBe('mes_cerrado');
    expect(quitar.cuerpo.error.codigo).toBe('activo_con_libros_usados');
    tercero = nuevo;
  });

  it('un activo con cuotas no se elimina', async () => {
    const eliminar = await cuenta.propietario.delete(`${RUTA}/${grande}`);
    expect([eliminar.estado, eliminar.cuerpo.error.codigo]).toEqual([422, 'activo_con_movimientos']);
  });
});

describe('segundo mes: huella, reabrir y volver a cerrar', () => {
  it('si algo cambia entre revisar y cerrar, se pide revisar de nuevo', async () => {
    const { cuerpo: vista } = await revisar('2026-10-01');
    await cuenta.propietario.post(`${RUTA}/${tercero}/poner-en-uso`, { fechaDeInicioDeUso: '2026-10-05' });

    const cierre = await cerrar('2026-10-01', { huella: vista.huella });

    expect(cierre.estado).toBe(422);
    expect(cierre.cuerpo.error.codigo).toBe('revision_del_cierre_desactualizada');
    expect(cierre.cuerpo.error.detalles.huella).not.toBe(vista.huella);
    expect(await cuotasVigentes('2026-10-01')).toHaveLength(0);
  });

  it('cierra el segundo mes con los tres activos, con la acumulada del mes anterior', async () => {
    const cierre = await cerrar('2026-10-01');

    expect(cierre.estado).toBe(200);
    expect(cierre.cuerpo).toMatchObject({ totalContable: '4383.34', totalFiscal: '4383.34', activosDepreciados: 3 });
    const grandes = (await cuotasVigentes('2026-10-01')).filter((c) => c.monto === '4166.67');
    expect(grandes.map((c) => c.acumulada)).toEqual(['8333.34', '8333.34']);
  });

  it('solo se reabre el último cerrado, y con motivo', async () => {
    const anterior = await reabrir('2026-09-01');
    const sinMotivo = await cuenta.propietario.post(`${DEPRECIACION}/2026-10-01/reabrir`, {});

    expect(anterior.estado).toBe(422);
    expect(anterior.cuerpo.error.codigo).toBe('solo_se_reabre_el_ultimo');
    expect(sinMotivo.estado).toBe(400);
  });

  it('reabrir deja las cuotas no vigentes (no las borra), audita con el cierre por clase y vuelve a ser el siguiente', async () => {
    const respuesta = await reabrir('2026-10-01');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'reabierto', motivoDeReapertura: 'Falta un costo del flete' });
    expect(await cuotasVigentes('2026-10-01')).toHaveLength(0);
    const [conservadas] = await comoPropietario<{ total: string }>(
      `select count(*) total from activos_fijos.cuotas c join core.empresas e on e.id = c.empresa_id
        where e.cuenta_id = $1 and c.periodo = '2026-10-01' and not c.vigente`,
      [cuenta.cuentaId],
    );
    expect(conservadas?.total).toBe('6');
    const filas = await auditoria('reabrir');
    expect(filas).toHaveLength(1);
    expect(filas[0]!.motivo).toBe('Falta un costo del flete');
    expect(filas[0]!.anterior).toMatchObject({
      periodo: '2026-10-01',
      totalContable: '4383.34',
      porClase: [{ clase: 'Vehículos', contable: '4383.34', fiscal: '4383.34' }],
    });
    expect((await cuenta.propietario.get(DEPRECIACION)).cuerpo.siguienteMes).toBe('2026-10-01');
  });

  it('con el mes reabierto se puede quitar de uso un activo cuyo único cierre se reabrió', async () => {
    const quitar = await cuenta.propietario.post(`${RUTA}/${tercero}/quitar-de-uso`);

    expect(quitar.estado, JSON.stringify(quitar.cuerpo)).toBe(200);
    expect(quitar.cuerpo).toMatchObject({ estado: 'en_construccion', tramos: [] });
    const [tramos] = await comoPropietario<{ vigentes: string; total: string }>(
      `select count(*) filter (where vigente) vigentes, count(*) total from activos_fijos.tramos where activo_id = $1`,
      [tercero],
    );
    expect(tramos).toEqual({ vigentes: '0', total: '2' });
  });

  it('dos cierres del mismo mes a la vez: pasa uno y el otro se rechaza, sin cuotas dobles', async () => {
    const respuestas = await Promise.all([cerrar('2026-10-01'), cerrar('2026-10-01')]);

    expect(respuestas.map((r) => r.estado).sort()).toEqual([200, 422]);
    expect(respuestas.find((r) => r.estado === 422)!.cuerpo.error.codigo).toBe('mes_cerrado');
    expect(await cuotasVigentes('2026-10-01')).toHaveLength(4);
    const lista = await cuenta.propietario.get(DEPRECIACION);
    expect(lista.cuerpo.cierres.map((c: { estado: string }) => c.estado)).toEqual(['cerrado', 'cerrado']);
    expect(await auditoria('cerrar')).toHaveLength(3);
  });
});

describe('permisos y aislamiento', () => {
  it('ver permite revisar pero no cerrar; cerrar no permite reabrir', async () => {
    const ve = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Cierre Ve',
      apellidos: 'Solo',
      permisos: ['activos-fijos.depreciacion.ver'],
    });
    const cierra = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Cierre Cierra',
      apellidos: 'Solo',
      permisos: ['activos-fijos.depreciacion.cerrar'],
    });

    expect((await ve.get(DEPRECIACION)).estado).toBe(200);
    expect((await revisar('2027-01-01', ve)).estado).toBe(200);
    expect((await cerrar('2027-01-01', {}, ve)).estado).toBe(403);
    expect((await cierra.get(DEPRECIACION)).estado).toBe(403);
    expect((await cierra.post(`${DEPRECIACION}/2026-10-01/reabrir`, { motivo: 'x' })).estado).toBe(403);
  });

  it('otra cuenta no ve ni cierra lo de esta: su depreciación empieza de cero', async () => {
    expect((await ajena.propietario.get(DEPRECIACION)).cuerpo).toEqual({ siguienteMes: null, cierres: [] });
    expect((await cerrar('2026-09-01', {}, ajena.propietario)).cuerpo.error.codigo).toBe('sin_mes_por_cerrar');
  });
});
