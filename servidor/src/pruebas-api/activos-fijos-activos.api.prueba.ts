/**
 * Activos (AF-2): alta manual sin costos, código propuesto, lista y ficha con el historial de ubicación, editar,
 * ocioso, eliminar con auditoría, nombres de localidad visibles sin acceso a ella (AF-P22 b), aislamiento y permisos.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, crearUbicaciones, datosDeActivo, edicionDeActivo } from './soporte/escenario-de-activos.js';

const RUTA = '/api/activos-fijos/activos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let claseId: string;
let edificiosId: string;
let localidadId: string;
let departamentoId: string;

const datos = (cambios: Record<string, unknown> = {}) => datosDeActivo(claseId, cambios);
const edicion = (cambios: Record<string, unknown> = {}) => edicionDeActivo(claseId, cambios);

const auditoria = (accion: string, registroId: string) =>
  comoPropietario<{ anterior: { descripcion: string; ocioso: boolean } }>(
    "select anterior from core.auditoria where recurso = 'activos-fijos.activos' and accion = $1 and registro_id = $2",
    [accion, registroId],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Activos', usuario: 'propietarioactivos', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Activos ajena', usuario: 'propietarioactivosajeno', modulos });
  claseId = await claseDe(cuenta, 'Vehículos');
  edificiosId = await claseDe(cuenta, 'Edificios');
  ({ localidadId, departamentoId } = await crearUbicaciones(cuenta));
});

describe('alta manual', () => {
  it('propone el código, nace en construcción y deja su fila de alta en el historial', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ localidadId, departamentoId, responsable: 'Juan' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({
      codigo: 'AF-0001',
      estado: 'en_construccion',
      claseNombre: 'Vehículos',
      localidadNombre: 'Finca La Esperanza',
      departamentoNombre: 'Taller',
      responsable: 'Juan',
      cantidad: 1,
      ocioso: false,
    });
    expect(creado.cuerpo.traslados).toHaveLength(1);
    expect(creado.cuerpo.traslados[0]).toMatchObject({ esAlta: true, fecha: '2026-11-01', estado: 'vigente' });
  });

  it('el código no se repite (sin importar mayúsculas) y el siguiente propuesto salta los usados', async () => {
    const manual = await cuenta.propietario.post(RUTA, datos({ codigo: 'af-0002' }));
    const repetido = await cuenta.propietario.post(RUTA, datos({ codigo: 'AF-0002' }));
    const propuesto = await cuenta.propietario.post(RUTA, datos());

    expect(manual.estado).toBe(201);
    expect(repetido.estado).toBe(409);
    expect(propuesto.cuerpo.codigo).toBe('AF-0003');
  });

  it('un bien de control o de terceros nace en uso', async () => {
    const control = await cuenta.propietario.post(RUTA, datos({ tipoDeRegistro: 'bien_de_control', origen: 'compra' }));
    const ajeno = await cuenta.propietario.post(
      RUTA,
      datos({ tipoDeRegistro: 'de_terceros', origen: null, propietario: 'Vecino', formaDeTenencia: 'comodato' }),
    );

    expect(control.cuerpo.estado).toBe('en_uso');
    expect(ajeno.cuerpo).toMatchObject({ estado: 'en_uso', propietario: 'Vecino', formaDeTenencia: 'comodato' });
  });

  it('rechaza lo que no cumple las reglas', async () => {
    const sinClase = await cuenta.propietario.post(RUTA, datos({ claseId: crypto.randomUUID() }));
    const matriculaEnVehiculo = await cuenta.propietario.post(RUTA, datos({ valorDeMatricula: '1000.00' }));
    const departamentoSinLocalidad = await cuenta.propietario.post(
      RUTA,
      datos({ departamentoId: crypto.randomUUID() }),
    );
    const sinDescripcion = await cuenta.propietario.post(RUTA, datos({ descripcion: '' }));
    const edificio = await cuenta.propietario.post(
      RUTA,
      datos({ claseId: edificiosId, valorDeMatricula: '500000.00', valorCatastral: '450000.50' }),
    );

    expect(sinClase.estado).toBe(404);
    expect(matriculaEnVehiculo.cuerpo.error.codigo).toBe('valor_fiscal_solo_en_edificios');
    expect(departamentoSinLocalidad.estado).toBe(404);
    expect(sinDescripcion.estado).toBe(400);
    expect(edificio.estado).toBe(201);
    expect(edificio.cuerpo).toMatchObject({ valorDeMatricula: '500000.00', valorCatastral: '450000.50' });
  });

  it('un componente cuelga de un activo principal, no de otro componente', async () => {
    const principal = await cuenta.propietario.post(RUTA, datos({ descripcion: 'Camión' }));
    const motor = await cuenta.propietario.post(
      RUTA,
      datos({ descripcion: 'Motor', activoPadreId: principal.cuerpo.id }),
    );
    const nieto = await cuenta.propietario.post(RUTA, datos({ activoPadreId: motor.cuerpo.id }));

    expect(motor.estado).toBe(201);
    expect(nieto.cuerpo.error.codigo).toBe('componente_de_un_componente');
  });
});

describe('lista y ficha', () => {
  it('filtra por texto, estado y tipo, y la ficha trae el activo con su historial', async () => {
    const lista = (consulta: string) => cuenta.propietario.get(`${RUTA}?${consulta}`);
    const porTexto = await lista('texto=john');
    const enUso = await lista('estado=en_uso');
    const deTerceros = await lista('tipoDeRegistro=de_terceros');

    expect(porTexto.cuerpo.length).toBeGreaterThan(0);
    expect(enUso.cuerpo.every((a: { estado: string }) => a.estado === 'en_uso')).toBe(true);
    expect(deTerceros.cuerpo.map((a: { propietario: string }) => a.propietario)).toEqual(['Vecino']);
    const ficha = await cuenta.propietario.get(`${RUTA}/${porTexto.cuerpo[0].id}`);
    expect(ficha.cuerpo.traslados.length).toBeGreaterThan(0);
  });

  it('otra cuenta no ve los activos de esta', async () => {
    const mio = (await cuenta.propietario.get(RUTA)).cuerpo[0];

    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([]);
    expect((await otraCuenta.propietario.get(`${RUTA}/${mio.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.put(`${RUTA}/${mio.id}`, edicion())).estado).toBe(404);
    expect((await otraCuenta.propietario.delete(`${RUTA}/${mio.id}`)).estado).toBe(404);
  });
});

describe('editar, ocioso y eliminar', () => {
  it('edita lo descriptivo; la cantidad y la clase solo en construcción', async () => {
    const enUso = (await cuenta.propietario.post(RUTA, datos({ tipoDeRegistro: 'bien_de_control' }))).cuerpo;
    const enObra = (await cuenta.propietario.post(RUTA, datos({ descripcion: 'En obra' }))).cuerpo;

    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${enUso.id}`,
      edicion({ descripcion: 'Cambiado', marca: 'JD' }),
    );
    const bloqueado = await cuenta.propietario.put(`${RUTA}/${enUso.id}`, edicion({ cantidad: 4 }));
    const libre = await cuenta.propietario.put(`${RUTA}/${enObra.id}`, edicion({ cantidad: 4 }));

    expect(cambiado.cuerpo).toMatchObject({ descripcion: 'Cambiado', marca: 'JD', codigo: enUso.codigo });
    expect(bloqueado.estado).toBe(400);
    expect(libre.cuerpo.cantidad).toBe(4);
  });

  it('marcar ocioso pide motivo, solo en uso, y queda en la auditoría', async () => {
    const enUso = (await cuenta.propietario.post(RUTA, datos({ tipoDeRegistro: 'bien_de_control' }))).cuerpo;
    const enObra = (await cuenta.propietario.post(RUTA, datos())).cuerpo;
    const ruta = (id: string) => `${RUTA}/${id}/ocioso`;

    const sinMotivo = await cuenta.propietario.post(ruta(enUso.id), { ocioso: true, fecha: '2026-11-10' });
    const enConstruccion = await cuenta.propietario.post(ruta(enObra.id), {
      ocioso: true,
      fecha: '2026-11-10',
      motivo: 'x',
    });
    const marcado = await cuenta.propietario.post(ruta(enUso.id), {
      ocioso: true,
      fecha: '2026-11-10',
      motivo: 'Sin operador',
    });
    const quitado = await cuenta.propietario.post(ruta(enUso.id), { ocioso: false, fecha: '2026-11-12' });

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_de_ocio_requerido');
    expect(enConstruccion.cuerpo.error.codigo).toBe('activo_no_en_uso');
    expect(marcado.cuerpo).toMatchObject({ ocioso: true, ociosoDesde: '2026-11-10', motivoDeOcio: 'Sin operador' });
    expect(quitado.cuerpo).toMatchObject({ ocioso: false, motivoDeOcio: null });
    expect(await auditoria('corregir', enUso.id)).toHaveLength(2);
  });

  it('elimina con su rastro en la auditoría, y no si tiene componentes', async () => {
    const principal = (await cuenta.propietario.post(RUTA, datos({ descripcion: 'Principal' }))).cuerpo;
    await cuenta.propietario.post(RUTA, datos({ descripcion: 'Parte', activoPadreId: principal.id }));
    const suelto = (await cuenta.propietario.post(RUTA, datos({ descripcion: 'Suelto' }))).cuerpo;

    const conComponentes = await cuenta.propietario.delete(`${RUTA}/${principal.id}`);
    const eliminado = await cuenta.propietario.delete(`${RUTA}/${suelto.id}`);

    expect(conComponentes.cuerpo.error.codigo).toBe('activo_con_movimientos');
    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${suelto.id}`)).estado).toBe(404);
    const filas = await auditoria('eliminar', suelto.id);
    expect(filas).toHaveLength(1);
    expect(filas[0]!.anterior.descripcion).toBe('Suelto');
  });

  it('una clase con activos no se elimina: se inactiva', async () => {
    const eliminada = await cuenta.propietario.delete(`/api/activos-fijos/clases/${claseId}`);

    expect(eliminada.cuerpo.error.codigo).toBe('clase_en_uso');
  });
});
