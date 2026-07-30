# Manual de usuario DataCL

**Versión:** 1.0  
**Fecha:** 27 de julio de 2026  
**Sistema:** DataCL

## 1. Objetivo

Este manual explica el uso funcional de DataCL para una organización usuaria. Está redactado con precisión técnica para que un profesor pueda revisar el comportamiento del sistema sin depender de supuestos externos.

DataCL es una plataforma web para gestionar el Registro de Actividades de Tratamiento (RAT), analizar fuentes de datos, clasificar campos personales o sensibles, administrar tratamientos, generar informes PDF y revisar historial de versiones.

## 2. Alcance del sistema

El sistema tiene dos perfiles principales:

* **Organización usuaria**: crea, analiza, edita y mantiene tratamientos RAT.
* **Administrador**: revisa organizaciones y métricas globales.

La navegación principal del usuario autenticado incluye:

* Inicio: `/dashboard`
* Mis tratamientos: `/mis-tratamientos`
* Nueva sesión de análisis: `/subir-archivo`
* Conexión a base de datos: `/nueva-sesion/conexion-bd`
* Ingreso manual: `/nueva-sesion/manual`
* Informes: `/informes`
* Perfil: `/perfil`
* Riesgos: `/riesgos`

## 3. Requisitos previos

Antes de usar el sistema, el usuario debe contar con:

* Una cuenta registrada en DataCL.
* Correo electrónico y contraseña válidos.
* Navegador moderno con JavaScript habilitado.
* Acceso a la base de datos o archivos a analizar, si corresponde.

## 4. Acceso al sistema

### 4.1 Registro

La pantalla de registro solicita estos campos:

* Nombre de la organización
* RUT de la organización
* Correo electrónico
* Contraseña
* Confirmar contraseña

Validaciones relevantes:

* El RUT debe tener formato `12345678-9` o `12345678-K`.
* El correo debe ser válido.
* La contraseña debe tener entre 8 y 72 caracteres.
* El correo y el RUT no pueden repetirse en el sistema.

### 4.2 Inicio de sesión

La pantalla de acceso solicita:

* Correo electrónico
* Contraseña

Si las credenciales son correctas:

* El sistema crea un token JWT.
* El usuario queda autenticado.
* Si el rol es `ADMIN`, redirige a `/dashboardAdmin`.
* En caso contrario, redirige a `/dashboard`.

### 4.3 Recuperación de contraseña

La ruta `/recuperar-password` permite iniciar un flujo de recuperación por correo. Si el backend no está configurado para el envío, esta pantalla debe considerarse solo como punto de contacto o futura expansión.

## 5. Inicio

La pantalla `/dashboard` resume la actividad de la organización.

### 5.1 Elementos principales

* Saludo con el nombre de la organización.
* Fecha actual.
* Tarjetas de métricas:
  * Tratamientos registrados
  * Tratamientos pendientes
  * Riesgo alto
* Gráfico de distribución de riesgo.
* Gráfico de estado de tratamientos.
* Top 3 tratamientos de mayor riesgo.
* Banner de sesiones guardadas como borrador.
* Botón flotante `+ Nuevo tratamiento`.

### 5.2 Borradores

Si existen sesiones guardadas como borrador:

* El sistema muestra el nombre de la sesión.
* Indica la fuente: archivo, ingreso manual o conexión BD.
* Permite:
  * `Continuar →`
  * `Descartar`

La continuación reconstruye el estado del formulario según la sesión guardada.

## 6. Mis tratamientos

La pantalla `/mis-tratamientos` muestra todos los tratamientos de la organización autenticada.

### 6.1 Acciones disponibles

* `Carga tu archivo (nuevo tratamiento)` lleva a `/subir-archivo`.
* `+ Nuevo tratamiento` abre el formulario manual `/nuevo-tratamiento`.
* Buscar por nombre.
* Filtrar por:
  * Riesgo bajo
  * Riesgo medio
  * Riesgo alto
  * Pendiente
  * Completo
  * Borrador

### 6.2 Tabla de tratamientos

Cada fila muestra:

* Nombre
* Nivel de riesgo
* Estado
* Fecha
* Acceso al historial de versiones

Acciones:

* Clic sobre la fila: abre el detalle del tratamiento.
* `Ver historial de versiones`: abre `/mis-tratamientos/:id/historial`.

## 7. Creación de tratamientos

DataCL permite crear tratamientos de dos formas:

* Mediante análisis de archivo, BD o ingreso manual.
* Mediante formulario directo en tres pasos.

## 8. Nueva sesión de análisis

La pantalla `/subir-archivo` permite iniciar una sesión desde cuatro fuentes:

* Conectar a BD
* Subir archivo
* Ingresar manualmente
* Sesiones anteriores

### 8.1 Subir archivo

La opción de archivo acepta:

* CSV
* Excel `.xlsx`
* Excel `.xls`

Restricciones técnicas:

* Máximo 5 archivos por sesión en el front.
* Máximo 10 archivos por análisis en el backend.
* Límite de 5 MB por archivo.
* El backend procesa el contenido en memoria y no persiste el archivo de análisis.

Flujo:

1. Seleccionar o arrastrar archivos.
2. Opcionalmente adjuntar un diccionario de datos.
3. Presionar `Analizar archivo` o `Analizar archivos`.
4. Revisar el resultado en `/resultados-analisis`.

### 8.2 Diccionario de datos

Si los nombres de columnas son técnicos, el sistema puede usar un diccionario con dos columnas:

* `nombre_tecnico`
* `descripcion`

También permite usar un diccionario solo, sin archivo de datos, desde la pestaña `Subir solo diccionario de datos`.

### 8.3 Sesiones anteriores

La pestaña `Sesiones anteriores` permite:

* Ver sesiones previas.
* Reutilizar una sesión ya procesada.

Esto evita repetir un análisis cuando los datos de origen no cambiaron.

## 9. Conexión a base de datos

La ruta `/nueva-sesion/conexion-bd` permite analizar estructuras de base de datos sin leer el contenido de los registros.

### 9.1 Pantalla de instrucciones

El sistema muestra instrucciones para crear un usuario de solo lectura según el motor:

* MySQL
* PostgreSQL
* SQL Server

La lógica del sistema está diseñada para leer solo:

* nombres de tablas
* nombres de columnas

No guarda credenciales ni contenido de datos.

### 9.2 Formulario de conexión

Campos solicitados:

* Motor de base de datos
* Nombre de la base de datos
* Host
* Puerto
* Usuario
* Contraseña

Acciones:

* `Probar conexión`
* Seleccionar tablas encontradas
* `Describir columnas →`
* `Analizar directo →`

### 9.3 Diccionario de columnas

Si el usuario selecciona `Describir columnas →`, el sistema muestra cada columna detectada y permite agregar una descripción opcional. Esa descripción mejora la clasificación.

### 9.4 Resultado del análisis

El resultado se envía a `/resultados-analisis` con:

* campos detectados
* campos pendientes
* total de columnas
* resumen por tipo de dato

## 10. Asignación de campos a RAT

La pantalla `/resultados-analisis` permite transformar los campos detectados en uno o varios RAT.

### 10.1 Función principal

* A la izquierda se muestran los campos detectados y pendientes.
* A la derecha se crean actividades RAT.
* El usuario asigna campos a cada RAT haciendo clic en los elementos.

### 10.2 Acciones disponibles

* `Marcar todos`
* `Nuevo RAT`
* Quitar un campo asignado
* Eliminar una actividad
* Filtrar por tabla o archivo de origen
* `Guardar borrador`
* `Continuar →`

### 10.3 Comportamiento técnico

* Cada campo tiene un identificador compuesto por nombre y tabla o archivo de origen.
* Un campo puede ser asignado a más de una actividad si corresponde.
* Si el usuario cambia de filtro y hay asignaciones cruzadas entre tablas, el sistema muestra una advertencia.
* Guardar borrador crea o actualiza una sesión en `/sesiones` y guarda los tratamientos parciales asociados.

## 11. Formulario RAT de tres pasos

La ruta `/nuevo-tratamiento` inicia el formulario del RAT. Las pantallas `/nuevo-tratamiento/paso2` y `/nuevo-tratamiento/paso3` completan el flujo.

### 11.1 Paso 1: Identificación

Campos principales:

* Nombre del tratamiento
* Responsable del tratamiento
* Rol: Responsable o Encargado
* Departamento, área o dominio
* Área específica
* Descripción detallada del tratamiento
* Finalidad
* Base legal

Información adicional opcional:

* Procesos relacionados
* Finalidades secundarias
* Documento de respaldo o permiso
* Cómo se informa a los titulares

Validación:

* El sistema no permite avanzar si faltan nombre, responsable, finalidad o base legal.

### 11.2 Paso 2: Datos y titulares

Campos principales:

* Categorías de titulares
* Universo de titulares
* Origen de los datos
* Categorías de datos
* ¿Este tratamiento incluye datos sensibles?
* Tipos de datos sensibles
* ¿Incluye datos de menores de edad?
* ¿Se tratan datos de navegación o identificadores digitales?
* Destinatarios internos, nacionales e internacionales
* ¿Los datos salen al extranjero?
* País de destino
* ¿Los terceros actúan como encargados?
* ¿Existen contratos de protección de datos?
* ¿Qué datos se transfieren a terceros?
* Método de transferencia
* Sistemas de origen
* Sistemas de destino
* Sistemas de tratamiento
* Tipos de tratamiento en los sistemas
* Nombre de la base de datos
* Proveedor tecnológico

Comportamiento relevante:

* El sistema puede sugerir categorías detectadas automáticamente.
* Si una categoría detectada se desmarca, queda registrada como desmarcada manualmente.
* El campo `sale_extranjero` puede activarse automáticamente si se completan destinatarios internacionales.

### 11.3 Paso 3: Seguridad y conservancia

Campos principales:

* Plazo de conservación
* Plazo libre, si se selecciona `Otro`
* Medidas de seguridad
* Otras medidas
* ¿Existen decisiones automatizadas?

Principios Ley 21.719:

* Criterio de plazo
* Método de eliminación
* ¿Se documenta la destrucción?
* Excepciones al plazo
* Justificación de minimización
* Mecanismos de exactitud
* Evaluación periódica
* Cumplimiento demostrable
* Incidentes históricos
* Cambios futuros previstos

DPIA:

* ¿Este tratamiento requiere una DPIA?
* ¿Se ha realizado la DPIA?
* Detalles de la DPIA

### 11.4 Revisión final

El acordeón `Revisar todo antes de guardar` muestra un resumen técnico del formulario completo antes del guardado.

Botones finales:

* `Guardar borrador`
* `← Atrás`
* `Guardar`
* `Guardar y continuar →`
* En modo edición, `Actualizar RAT`

## 12. Detalle de tratamiento

La ruta `/tratamientos/:id` muestra el detalle completo de un tratamiento.

### 12.1 Elementos visibles

* Breadcrumb de navegación.
* Nombre del tratamiento.
* Estado.
* Nivel de riesgo.
* Fecha de registro.
* Secciones con datos y criterios del RAT.
* Evaluación de riesgo con probabilidad e impacto.
* Secciones extendidas si existen datos guardados.

### 12.2 Acciones

* `Editar`
* `Eliminar`

### 12.3 Evaluación de riesgo

El sistema muestra:

* Probabilidad
* Impacto
* Justificación de por qué ese riesgo fue asignado

La evaluación se basa en la metodología AEPD adaptada a Ley 21.719.

## 13. Edición de tratamiento

La ruta `/tratamientos/:id/editar` reutiliza el mismo formulario de tres pasos.

Comportamiento:

* El usuario modifica los campos permitidos.
* Al guardar, el sistema recalcula el estado final.
* Si faltan datos críticos, el tratamiento puede quedar como `PENDIENTE`.
* Si el formulario queda completo, pasa a `COMPLETO`.

## 14. Historial de versiones

La ruta `/mis-tratamientos/:id/historial` muestra la trazabilidad completa del tratamiento.

### 14.1 Qué registra

* Número de versión
* Fecha y hora
* Usuario o entidad que modificó
* Descripción del cambio
* Campos modificados
* Riesgo asociado a la versión

### 14.2 Acciones

* `Ver`
* `PDF`
* `Editar`
* `Ver RAT completo`
* `Descargar PDF`

### 14.3 Uso técnico

* La versión vigente es la de mayor `numero_version`.
* El detalle de una versión se obtiene a demanda.
* El PDF puede generarse desde esta pantalla incluso para un tratamiento individual.

## 15. Informes

La pantalla `/informes` lista los informes PDF ya generados.

### 15.1 Vista previa de informe

La ruta `/informes/nuevo` permite seleccionar qué tratamientos incluir en el PDF.

Funciones:

* Seleccionar tratamientos con checkbox.
* Seleccionar o deseleccionar todos.
* Ver totales por nivel de riesgo.
* `Generar informe PDF`
* `Personalizar PDF`

Restricción:

* No se puede generar el informe si no hay al menos un tratamiento seleccionado.

### 15.2 Confirmación de descarga

Después de generar el PDF, el sistema redirige a `/informes/confirmacion`.

Desde allí se puede:

* Descargar PDF
* Solicitar análisis con IA
* Ver el resultado del análisis IA si ya existe
* Volver a mis tratamientos

### 15.3 Análisis con IA

El análisis de IA es opcional.

Comportamiento:

* Si el informe ya lo tenía, el sistema solo lo recupera.
* Si no lo tenía, intenta generarlo con el proveedor configurado.
* Si el servicio de IA falla, el PDF sigue existiendo igual.

## 16. Personalización del informe PDF

La sección `Personalización del informe PDF` está dentro de `/perfil` y se puede abrir también desde `/informes/nuevo#personalizacion`.

### 16.1 Permite configurar

* Logo de la organización
* Color institucional

### 16.2 Restricciones técnicas

* Logo válido: PNG, JPG o JPEG.
* Tamaño máximo del logo: 2 MB.
* El color debe estar en formato hexadecimal `#RRGGBB`.

### 16.3 Efecto

* El logo y el color se aplican al PDF.
* No modifican la interfaz de la plataforma.

## 17. Perfil

La ruta `/perfil` permite administrar datos de la organización y la personalización PDF.

### 17.1 Datos de la organización

Campos visibles:

* Nombre de la organización
* RUT
* Correo electrónico

Acciones:

* Editar nombre
* Editar correo
* Guardar cambios
* Cancelar

El RUT no es editable.

### 17.2 Cambio de contraseña

Campos:

* Contraseña actual
* Contraseña nueva
* Confirmar contraseña nueva

Validaciones:

* La contraseña nueva debe tener al menos 8 caracteres.
* Debe coincidir con la confirmación.
* Debe ser distinta de la actual.

### 17.3 Logo y color

Acciones:

* Subir logo
* Eliminar logo
* Guardar color

## 18. Administración

El perfil `ADMIN` usa rutas distintas:

* `/dashboardAdmin`
* `/admin`
* `/admin/detalle/:id`
* `/admin/organizaciones/:id`

### 18.1 Panel de administración

La pantalla `/dashboardAdmin` muestra:

* Total de organizaciones registradas
* Tratamientos completos
* Tratamientos pendientes
* Tabla de organizaciones con búsqueda

### 18.2 Vista de administración

La pantalla `/admin` muestra:

* Total
* Completos
* Pendientes
* Tabla de usuarios/organizaciones y sus tratamientos

## 19. Cierre de sesión

El sistema incluye cierre de sesión desde la barra lateral.

Al cerrar sesión:

* Se elimina el token del contexto/localStorage.
* El usuario vuelve a `/login`.

## 20. Validaciones y límites técnicos

### 20.1 Análisis de archivos

* Solo CSV y Excel.
* Máximo 5 MB por archivo.
* Máximo 10 archivos por análisis en backend.
* El análisis requiere autenticación JWT.

### 20.2 Base de datos

* La conexión se abre temporalmente.
* El sistema no guarda credenciales.
* Solo lee metadatos de tablas y columnas.

### 20.3 Autenticación

* El backend usa JWT.
* Las rutas protegidas requieren `Authorization: Bearer <token>`.

### 20.4 Persistencia

* Los tratamientos sí se guardan en base de datos.
* Los archivos analizados no se almacenan como contenido bruto.
* Los informes PDF se guardan en disco y además se registran en base de datos.

## 21. Problemas frecuentes

### 21.1 No puedo iniciar sesión

Verificar:

* Correo escrito correctamente.
* Contraseña correcta.
* Backend en ejecución.

### 21.2 El archivo no se analiza

Verificar:

* Formato correcto.
* Tamaño inferior a 5 MB.
* No exceder el máximo de archivos.
* Que el backend esté activo.

### 21.3 La base de datos no conecta

Verificar:

* Host
* Puerto
* Usuario de solo lectura
* Contraseña
* Nombre real de la base de datos

### 21.4 No se puede descargar un informe

Posibles causas:

* El informe no existe.
* El archivo PDF fue eliminado del servidor.
* El usuario no pertenece a esa organización.

### 21.5 El perfil no se actualiza

Verificar:

* Que el correo no esté en uso por otra organización.
* Que el token siga vigente.
* Que no exista un error de red.

## 22. Observaciones para evaluación técnica

Si el manual se usa para revisión académica, conviene destacar que DataCL implementa:

* Frontend en React con rutas protegidas.
* Backend en FastAPI.
* Persistencia con SQLAlchemy.
* Autenticación con JWT.
* Generación de PDF.
* Historial de versiones.
* Análisis de riesgo.
* Análisis asistido por IA.

## 23. Recomendación de entrega

Para entregar a un profesor, este manual se puede exportar a PDF o DOCX manteniendo:

* portada
* índice
* capturas de pantalla
* pasos numerados
* observaciones técnicas

Si quieres una versión más formal, este mismo contenido se puede transformar después en formato institucional con portada, índice automático y anexos.
