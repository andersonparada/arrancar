# Informe de QA en el navegador — 2026-09-29

Alcance: lo que nunca se había visto en el navegador (permisos por usuario, localidades y accesos,
Bancos B6/B7/H3/H6a/H9 y ajustes de conceptos). Chromium (escritorio 1280 px y celular 390 px, claro y
oscuro) más la API con sesiones reales. Base nueva (migrar y sembrar) con la cuenta «Finca QA» (2 empresas,
6 roles, 12 usuarios). Scripts y capturas en `/tmp/claude-0/qa`.

## Resultado por flujo

| Flujo | Resultado |
|---|---|
| Crear usuario con 2 empresas, 2 roles y permiso directo (ventana, celular/oscuro) | Bien (la lista de permisos desbordaba: corregido) |
| Página «Permisos de <usuario>» con origen (Rol / Directo), contador «9 en total» | Bien; suma de roles y directos cuadra |
| Sin permiso: 403 por API y botones ocultos (Carlos: ver notas, sin editar/eliminar/cheques) | Bien |
| No editarse a sí mismo (empresas, roles, permisos, desactivarse) | Bien (422); en la lista no hay ícono de permisos en la tarjeta propia |
| Roles y permisos: lista y conteos | Error bajo (plural «1 permisos», corregido) |
| Tipos de localidad, localidades: crear asigna al creador, código y nombre repetidos | Bien / Error medio (mayúsculas) |
| Usuario sin `ver-todas` ve solo las suyas; con `ver-todas` ve todas | Bien |
| Ficha con «Usuarios con acceso» | Bien |
| Ventana «Accesos»: carga, autoasignación con aviso, guardar | Error alto (2 fallas, corregidas) |
| Departamentos con localidad opcional, código repetido | Bien |
| Notas: crear, montos 0/negativo/3 decimales, doble clic, anular, eliminar limpia | Bien (mensaje de anulación con «»: corregido) |
| Transferencias: crear, sobregiro, anular (2 inversos), saldos de A y B | Bien |
| Cheques: emitir, anular, causa `manual`, cheque manual con «Pago a proveedores» | Bien |
| Reporte Movimientos (pantalla, imprimir, Excel), Flujo de efectivo, Movimientos por concepto | Bien; cuadran a mano (ver abajo) |
| H6a cheques caducos (corte 28/02/2026 con 7 meses) e H9 correlativos (huecos explicados) | Bien |
| Bandeja «Sin clasificar» | Solo estado vacío: ya no se puede crear algo sin clasificar (ver nota) |
| Conciliación febrero (B5.1): marcar, terminar, autorizar por otra persona | Error alto (cuadro del banco) |

Cuadres a mano (cuenta Q1): 10,000.00 +1,500.50 −1,000.00 −250 −250 −1,500.50 +1,000.00 = 9,500.00 (igual al
reporte y a la conciliación de libros). Flujo de efectivo: saldos iniciales 10,500.00 − flujo 500.00 = 10,000.00
(9,500 + 500 de Q2), diferencia 0.00. Cheques caducos: 2 × 250.00 = 500.00 (corte correcto).

## Errores

### Alta
1. **Ventana «Accesos» rota** (corregido). `GET /empresas/localidades/accesos/:usuarioId` devuelve un arreglo
   de ids, pero el cliente leía `.localidadIds`. Pasos: Localidades > Accesos > elegir usuario. Esperado: sus
   localidades marcadas. Pasó: aviso «original.value is not iterable» y todo desmarcado (guardar habría
   borrado sus accesos). Arreglo: `servicios/accesos-a-localidades.api.ts`.
2. **La confirmación al asignarse a sí mismo quedaba oculta** (corregido). La confirmación y la ventana de
   accesos usaban el mismo `z-40` y la de accesos, abierta después, la tapaba: «Guardar accesos» se quedaba
   esperando sin mostrar nada. Aplica a cualquier confirmación abierta sobre una ventana. Arreglo:
   `VentanaModal` acepta `encima` (`z-[60]`) y `CapaAvisos` lo usa.
3. **Conciliación: el cuadro del banco cuenta dos veces el saldo inicial** (CORREGIDO 2026-09-29: el saldo inicial
   de banco de la primera conciliación es 0). Pasos: cuenta con saldo inicial 10,000.00 (01/01) y un mes con movimientos; iniciar la
   conciliación de febrero como primera de la cuenta (el sistema deja empezar en cualquier mes), marcar el
   saldo inicial y el cheque 1, terminar. Esperado: «Según banco» saldo final = «Saldo que debe mostrar»
   (9,750.00), como pide `bancos.md` B5.1. Pasó: Saldo inicial banco 10,000.00 + ingresos 12,500.50 −
   egresos 2,750.50 = **19,750.00**, y el estado de cuenta esperado 9,750.00. Sin marcar el saldo inicial
   aparece como «crédito en tránsito» y el saldo esperado sale **Q 0.00**. Sugerencia: no ofrecer el
   movimiento «Saldo inicial» para marcar (o darlo por conciliado en la primera conciliación).

### Media
4. **500 con un monto enorme** (CORREGIDO 2026-09-29: 400 desde el esquema común de decimales). `POST /bancos/notas` con `monto: "1000000000000.00"` responde 500
   `error_interno` (numeric(14,2)). Esperado: 400 «monto demasiado grande». Revisar en todos los montos.
5. **Nombres repetidos que difieren solo en mayúsculas** (CORREGIDO 2026-09-29: índices únicos sobre `core.nombre_normalizado(nombre)` en roles, localidades, tipos de localidad, departamentos, bancos, cuentas bancarias, conceptos y categorías de proveedor; migraciones core 0020, empresas 0009, bancos 0027, terceros 0006, que fallan con mensaje claro si hay repetidos) se aceptan: localidad «  LOCALIDAD 1 » junto a
   «Localidad 1» (201) y concepto «planilla» junto a «Planilla» (201; «Planílla» también). El exacto sí avisa.
   Esperado: comparar sin mayúsculas ni acentos, como ya hace `nombre_para_comparar` (migraciones 0024/0025
   en curso).
6. **Los dos inversos de una transferencia anulada aparecen en «Notas»** (CORREGIDO 2026-09-29: el inverso hereda la `transferencia_id` de su original, así ni sale en Notas ni lleva número; la migración bancos 0027 corrige los existentes) como notas de crédito/débito
   «Reversión de TR-1», mientras que sus originales no aparecen. La consulta excluye por
   `transferencia_id` y los inversos lo llevan nulo
   (`consultas-movimientos.drizzle.ts`, `condicionDeLaClase`). Aparecen también en la cuenta de notas del
   correlativo (sí llevan número solo los de notas).
7. **La conciliación deja iniciar cualquier mes** (NO SE CAMBIÓ: `bancos.md` B5 dice expresamente que la primera conciliación de una cuenta puede ser de cualquier mes; queda pendiente si el dueño quiere exigir el mes del saldo inicial) si la cuenta no tiene ninguna (febrero sin haber hecho
   enero) y luego enero ya no se puede iniciar. Confirmar si es lo acordado («meses en orden»).

### Baja
8. **Mensajes técnicos de validación** (CORREGIDO 2026-09-29: `mensajes-de-validacion.ts`: «Campo obligatorio.», «Escriba como máximo N caracteres.», etc.) en pantalla: «Demasiado pequeño: se esperaba que texto tuviera >=1
   caracteres» (motivo vacío al anular) y «Demasiado grande… <=150 caracteres». Mejor «Escriba el motivo.».
9. **Limitador de inicio de sesión responde en inglés** (CORREGIDO 2026-09-29: código `demasiadas_solicitudes`, en español): «Rate limit exceeded, retry in 2 seconds».
10. **Cambiar la propia contraseña no pide la actual** (CORREGIDO 2026-09-29: `contrasenaActual` obligatoria cuando el usuario cambia la suya; no se pide al administrador que cambia la de otro) (`PUT /usuarios/:id/contrasena`; además cierra todas las
    sesiones, incluida la actual). Decidir si se exige.
11. **Fecha futura aceptada** (NO SE CAMBIÓ: los planes no dicen nada de bloquear fechas futuras en notas, transferencias o saldos iniciales; los cheques posfechados sí están permitidos. Requiere decisión del dueño) en notas (2030-01-01 devolvió 201) sin aviso.
12. **La transferencia lleva No. 1** (CORREGIDO 2026-09-29: el reporte y el Excel muestran el número de la transferencia en sus notas e inversos) en su lista pero sus dos movimientos salen con «—» en No. del reporte
    Movimientos y en el Excel.
13. Ventana Accesos (CORREGIDO 2026-09-29): el aviso «Es usted: al guardar se está dando acceso a sí mismo» sale también para quien
    ve todas las localidades (ahí no se puede guardar).
14. (Sin cambios: no se pudo ver en el navegador) Reporte Movimientos en 1280 px: la columna Crédito queda cortada (hay que desplazar la tabla).
15. «1 permisos · 1 asignaciones» (corregido). Aviso «nota «»» al anular/eliminar sin referencia (corregido).
    Claves de permisos que desbordaban su columna (corregido, `break-all`).

## Decisiones ya tomadas por el usuario (no son errores, pero conviene saberlas)
- Quien tiene `usuarios.asignar-permisos` puede dar un rol de acceso total y **quitarle los roles a la
  propietaria** (probado: Bea, con «Admin de usuarios», dejó a Paula sin rol; hubo que restaurarla). Es
  la respuesta 4 y 5 del diseño (no hay reglas «no dar lo que no se tiene» ni «siempre un dueño»).

## Pendiente o no probado
- **Bandeja «Sin clasificar» con datos**: no hay forma de crearlos por API (el concepto de sistema no se
  elige) y no se permitió escribir en la base para simularlos. Falta probar reclasificar en lote.
- **Conciliación demo**: la cuenta «demo» no tiene datos; se rehízo la conciliación B5.1 en la cuenta QA (Q1,
  febrero 2026, autorizada por otra persona; con el error 3). No se probó eliminarla ni «devolver».
- Sin probar: importar Excel, meses cerrados de Bancos con permisos parciales, recarga a mitad de un
  proceso, y Escape con dos ventanas abiertas.
- Datos que quedaron en la base de desarrollo: 2 conceptos de prueba («planilla», «Planílla») que no se
  pudieron borrar por API con el cuerpo vacío.

## Archivos tocados (todos quedaron en el commit `3082258` de otro agente)
- `cliente/src/modulos/empresas/servicios/accesos-a-localidades.api.ts`
- `cliente/src/modulos/core/componentes/VentanaModal.vue`, `CapaAvisos.vue`
- `cliente/src/modulos/core/componentes/roles/SelectorDePermisos.vue`
- `cliente/src/modulos/core/composables/roles/edicion-de-rol.ts` y `logica-de-pantallas-del-core.prueba.ts`
- `cliente/src/modulos/bancos/paginas/ListaDeNotas.vue`

## Decisiones del usuario (2026-09-29)

- **Primera conciliación en cualquier mes:** se deja como está (B5 lo permite a
  propósito para cuentas con historia). No es un error.
- **Fechas futuras** en notas, transferencias y saldos iniciales: **se permiten con
  aviso** en pantalla (los cheques posfechados ya estaban permitidos).
  **Hecho:** aviso naranja junto a la fecha (en cheques, aviso azul de posfechado) con la fecha de hoy de la zona horaria de la empresa (`AvisoDeFecha.vue`).
