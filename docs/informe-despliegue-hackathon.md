# Informe de opciones de despliegue — Bus Passenger Vision POC

**Fecha:** 29 de septiembre de 2026  
**Proyecto:** Bus Passenger Vision / Traffic Vision  
**Contexto:** Hackathon de conectividad 5G — Promotora Costarricense de Innovación e Investigación  
**Equipo:** Equipo universitario de cuatro integrantes, con comité de apoyo

## 1. Resumen ejecutivo

El POC necesita dos capacidades distintas:

1. **Durante el hackathon:** recibir videos de prueba, ejecutar detección y seguimiento de pasajeros y presentar resultados mediante una dirección web temporal.
2. **Para la solución posterior:** publicar un servicio estable al que la aplicación móvil de los pasajeros pueda consultar ocupación, estado y otra información autorizada.

La conectividad 5G resuelve el transporte de datos, pero no crea por sí sola el servidor, el procesamiento de IA, el almacenamiento ni el endpoint que consumirá la aplicación móvil. Antes de contratar infraestructura conviene preguntar a la universidad y a la organización del hackathon si proporcionarán nube, servidor, GPU, plataforma MEC/edge, dominio, certificados, almacenamiento o créditos.

La recomendación es una estrategia híbrida por etapas:

- **Primera opción:** utilizar infraestructura o créditos proporcionados por la universidad o por la organización del hackathon.
- **Alternativa administrada recomendada para el POC:** Google Cloud Run, almacenamiento de objetos y ejecución asíncrona de trabajos, inicialmente con CPU y con GPU solo si las mediciones lo justifican.
- **Alternativa equivalente:** AWS con S3, una cola y tareas ECS/Fargate; es sólida, aunque normalmente requiere configurar más componentes.
- **Contingencia inmediata:** publicar temporalmente la computadora de desarrollo mediante Cloudflare Tunnel, con autenticación, límites de carga y una cola de un solo trabajo.
- **SmarterASP.NET:** conservarlo para una interfaz o API liviana, pero no usar el plan compartido W1000 actual como motor de inferencia. Un cambio al plan Premium tampoco debe aprobarse sin confirmación escrita de memoria, CPU sostenida, procesos en segundo plano y compatibilidad con las bibliotecas nativas de ONNX Runtime. Su VPS ofrece mayor control, pero el plan inicial publicado actualmente cuesta alrededor de USD 99.95 mensuales y debe compararse con servicios de pago por uso.

No se debe seleccionar definitivamente el tamaño del servidor hasta terminar el procesamiento de video y medir un video completo. La imagen fija ya funciona, pero el consumo y la duración real de detección, seguimiento, codificación y almacenamiento de un video todavía no están medidos de extremo a extremo.

## 2. Estado técnico comprobado

- La aplicación utiliza React/TypeScript para la interfaz y ASP.NET Core para la API.
- El modelo RF-DETR fue convertido a ONNX y validado con las imágenes doradas.
- El archivo ONNX mide aproximadamente 123 MB.
- En pruebas locales de imagen fija, el proceso llegó aproximadamente a 718 MB de memoria privada después de varias inferencias.
- La inferencia de imagen fija tardó aproximadamente entre 1.9 y 3.4 segundos por llamada en la computadora de desarrollo.
- La carga y vista previa local de videos ya existe en la interfaz.
- Todavía están pendientes el procesamiento completo de video, el seguimiento estable, los eventos de puerta y la integración de los resultados reales con React.

Estas cifras descartan razonablemente el límite actual de 512 MB del plan W1000 para ejecutar el modelo junto con decodificación de video y seguimiento. También indican que será necesario controlar la frecuencia de muestreo, la concurrencia y la retención de archivos.

## 3. Arquitectura recomendada

### 3.1 POC del hackathon

```text
Navegador del evaluador
        |
        | HTTPS: carga video y consulta progreso
        v
API pública autenticada
        |
        +--> almacenamiento temporal del video
        |
        +--> cola: máximo inicial de 1 trabajo de IA
                    |
                    v
              trabajador de video
              detección + tracking
                    |
                    v
          JSON de resultados + evidencia visual
```

La carga debe responder rápidamente con un identificador de trabajo. El análisis se ejecuta en segundo plano y la interfaz consulta periódicamente el estado. No conviene mantener una solicitud HTTP abierta durante todo el procesamiento del video.

### 3.2 Aplicación móvil y solución futura

```text
Cámara dentro del autobús
        |
        | opción inicial: video por 5G hacia la nube
        | opción recomendada futura: inferencia a bordo
        v
Detección / tracking / eventos
        |
        | solo metadatos autorizados
        v
API central de ocupación y estado
        |
        +--> aplicación móvil de pasajeros
        +--> tablero operativo
        +--> histórico y métricas
```

La aplicación móvil no debería recibir el video de vigilancia ni ejecutar el modelo. Debe consultar un endpoint pequeño y estable, por ejemplo:

```http
GET /api/v1/buses/{busId}/occupancy
```

con información como ocupación estimada, capacidad, nivel de llenado, momento de la última actualización y calidad/confianza del dato.

Para el POC, enviar o cargar video al servidor central es la ruta más rápida. Para una solución real con cámaras continuas, la inferencia a bordo del autobús y el envío de eventos por 5G suele ser la arquitectura más razonable: reduce ancho de banda, latencia, costos y exposición de datos personales. La nube seguiría alojando el endpoint que consume la aplicación móvil.

## 4. Función real de la conectividad 5G

El 5G puede aportar baja latencia, movilidad, mayor ancho de banda y, si el organizador lo ofrece, acceso a cómputo en el borde o **MEC**. Sin embargo, todavía se necesita saber:

- si los dispositivos tendrán salida normal a Internet;
- si habrá una red privada/APN y cómo se alcanza un endpoint desde ella;
- si se proporcionará un servidor, contenedor, VM, GPU o plataforma MEC;
- si el endpoint podrá ser público o únicamente accesible dentro de la red del evento;
- si existen créditos para AWS, Google Cloud u otro proveedor;
- cuáles son las restricciones de video, privacidad, almacenamiento y retención;
- cuántos usuarios, autobuses y cargas simultáneas se esperan;
- si la demostración será con archivos previamente grabados o con cámara/transmisión en vivo.

Si la organización proporciona MEC o un servidor conectado directamente a su red 5G, esa alternativa podría ser técnica y narrativamente superior para el hackathon: demostraría no solo visión artificial, sino también el valor de la infraestructura 5G del evento.

## 5. Comparación de opciones

| Opción | Ventajas | Riesgos o límites | Uso recomendado |
|---|---|---|---|
| Infraestructura del organizador/MEC | Puede integrarse directamente con la red 5G; posible soporte y créditos; fortalece la propuesta del hackathon | Capacidad, acceso y fechas todavía desconocidos | **Consultar primero** |
| Infraestructura universitaria | Propiedad institucional, continuidad, posible GPU/VM y personal de TI | Procesos de aprobación; responsabilidades y acceso deben quedar claros | **Preferida para continuidad** |
| Cloudflare Tunnel hacia la PC | Activación rápida; HTTPS; no abre puertos del router; costo inicial bajo | La PC debe permanecer encendida; depende de Internet local; no agrega CPU/RAM; no es la solución final | Contingencia o demostración controlada |
| SmarterASP W1000 actual | Ya está contratado; adecuado para web/API liviana | 512 MB; sin trabajador persistente; riesgo de reciclado/timeout; capacidad nativa por validar | Solo frontend, estado o API liviana |
| SmarterASP Premium compartido | Bajo costo publicado; tareas programadas y .NET disponibles | Sus tareas programadas llaman una URL; no equivalen a un trabajador de IA permanente. Memoria/CPU y DLL nativas requieren confirmación | No comprar sin respuesta técnica escrita |
| SmarterASP VPS | Control administrativo y entorno Windows familiar | Precio base publicado cercano a USD 99.95/mes; administración, seguridad y capacidad siguen a cargo del equipo | Solo si la universidad desea un VPS Windows estable |
| Google Cloud Run | Contenedores .NET; escala a cero; pago por uso; trabajos asíncronos; hasta 32 GiB por instancia CPU; GPU L4 disponible | Presupuesto y almacenamiento deben configurarse; una GPU L4 exige al menos 4 vCPU y 16 GiB; hay que adaptar el contenedor Linux | **Mejor candidato administrado para el POC** |
| AWS ECS/Fargate | Arquitectura madura con S3/SQS; tareas por segundo; buen camino hacia producción | Más piezas y permisos; Fargate se cobra por CPU/RAM reservadas durante la tarea; GPU requiere otra modalidad basada en instancias | Alternativa si el equipo o la universidad ya domina AWS |

## 6. Evaluación específica de SmarterASP.NET

El plan W1000 puede seguir aportando valor, pero como capa liviana. El proveedor publica soporte para ASP.NET Core, Full Trust y despliegue desde GitHub. El plan Premium W1050 añade tareas programadas; la documentación oficial aclara que la tarea básica realiza una solicitud HTTP GET con una frecuencia mínima de 15 minutos. Eso no resuelve un trabajo de video iniciado por el usuario ni garantiza que IIS mantenga un proceso pesado hasta terminar.

Antes de pagar una mejora debe solicitarse confirmación escrita de:

1. Memoria real asignable al application pool en 64 bits.
2. Política de CPU sostenida y throttling.
3. Timeout máximo de solicitudes y política de idle shutdown/reciclado.
4. Permiso para cargar ONNX Runtime y SkiaSharp con DLL nativas x64.
5. Tamaño máximo de carga y espacio temporal por video.
6. Posibilidad de ejecutar un `BackgroundService` durante varios minutos sin solicitud activa.
7. Política sobre procesos de FFmpeg y ejecutables auxiliares.
8. Número de trabajos simultáneos permitido y consecuencias de exceder recursos.

Si alguna de las respuestas es negativa, SmarterASP puede alojar la página y el endpoint público, mientras la inferencia ocurre en otra plataforma. Esa separación es posible, pero agrega complejidad; para el POC sería preferible alojar la API y el trabajador en la misma plataforma administrada.

## 7. Control de costos y prevención de cargos inesperados

En cualquier nube se deben aplicar controles antes de ejecutar el primer video:

- proyecto/cuenta exclusivos para el POC;
- presupuesto y alertas desde el primer día;
- máximo inicial de una instancia y una tarea concurrente;
- escala mínima en cero cuando el servicio lo permita;
- límite por archivo, duración de video y cantidad diaria de análisis;
- autenticación y lista de usuarios autorizados;
- eliminación automática de videos y resultados después de un plazo corto;
- registros sin imágenes ni datos personales innecesarios;
- revisión diaria de gasto durante el hackathon;
- una persona responsable de facturación y otra de operación;
- prohibición de crear recursos fuera de la región y arquitectura acordadas.

En Google Cloud, un presupuesto de alertas por sí solo no detiene automáticamente el gasto; debe combinarse con límites de instancias, cuotas y, si está disponible para la cuenta, un límite de gasto. Google recomienda configurar un máximo de instancias y sugiere comenzar con tres; para este POC debe comenzarse con **una**. AWS permite acciones asociadas a presupuestos, pero deben configurarse correctamente y no sustituyen el diseño de límites técnicos.

## 8. Seguridad, privacidad y datos

Los videos pueden mostrar rostros y comportamiento de pasajeros. Aunque se trate de un POC, deben acordarse:

- base legal o consentimiento para utilizar imágenes reales;
- finalidad exacta y prohibición de reutilización no autorizada;
- cifrado HTTPS en tránsito y cifrado de archivos almacenados;
- acceso por identidad, no mediante un enlace público sin control;
- tiempo máximo de retención y eliminación verificable;
- no incluir video o identidad personal en la respuesta para la app móvil;
- métricas agregadas y, cuando sea posible, anonimización en el origen;
- dueño institucional de la cuenta, los datos, el dominio y las credenciales;
- procedimiento ante pérdida de una cuenta o filtración de un enlace.

El tracking del POC mantiene un identificador técnico dentro de un video; no debe presentarse como reconocimiento de identidad ni utilizar biometría.

## 9. Solicitud para el comité universitario

El comité puede asumir o coordinar las decisiones que no conviene dejar a una sola persona:

1. Confirmar si la universidad dispone de AWS, Google Cloud, Azure, VM, servidor o GPU institucional.
2. Identificar a la persona que puede crear el proyecto y administrar facturación/IAM.
3. Solicitar créditos educativos. Google publica créditos para docentes elegibles de hasta USD 100 por integrante docente y hasta USD 50 por estudiante, sujetos a elegibilidad y aprobación.
4. Proporcionar un dominio o subdominio institucional y certificados si corresponde.
5. Definir responsabilidad de soporte durante el evento.
6. Revisar privacidad, consentimiento y retención de videos reales.
7. Confirmar presupuesto máximo y autorización de compra.
8. Identificar quién será dueño y operador de la solución después del hackathon.

## 10. Solicitud para Carlos / Promotora

Se recomienda preguntar:

1. ¿La organización proporcionará cómputo cloud, VM, contenedores, GPU o MEC/edge conectado a la red 5G?
2. ¿Habrá créditos, patrocinadores o cuentas temporales de AWS, Google Cloud, Azure u otro proveedor?
3. ¿Los teléfonos, cámaras y equipos de demostración tendrán salida a Internet normal?
4. ¿Se permitirá que un endpoint público externo reciba datos desde la red 5G?
5. ¿La prueba esperada es carga de archivos, video en vivo o ambas?
6. ¿Cuántos usuarios o autobuses simultáneos deben soportarse durante la evaluación?
7. ¿Hay requisitos de latencia, residencia de datos, privacidad o eliminación?
8. ¿La Promotora puede facilitar videos reales autorizados o acceso controlado a una cámara de autobús?
9. ¿Existe un dominio, certificado o gateway de API del evento que los equipos puedan utilizar?
10. ¿Qué parte de la solución 5G se espera evidenciar ante los jueces: conectividad, baja latencia, edge computing, analítica en tiempo real o experiencia móvil?

## 11. Plan de decisión

### Paso 1 — completar y medir localmente

- Implementar procesamiento de video, tracking y progreso asíncrono.
- Medir tiempo total, memoria máxima, CPU, tamaño de resultados y calidad sobre los tres videos de prueba.
- Probar al menos un video distinto cargado por el usuario.
- Establecer frecuencia mínima de fotogramas que conserve tracking aceptable.

### Paso 2 — obtener respuestas institucionales

- Enviar las preguntas al comité universitario y a la Promotora en paralelo.
- Definir dueño de cuenta, presupuesto y tratamiento de datos.
- Confirmar si existe MEC, servidor o créditos antes de contratar.

### Paso 3 — prueba de despliegue

- Preparar un contenedor reproducible de API + trabajador.
- Probar primero CPU con una sola tarea.
- Comparar el tiempo y costo real de un video completo.
- Activar GPU únicamente si CPU no cumple el tiempo de demostración.
- Mantener Cloudflare Tunnel como contingencia independiente.

### Paso 4 — demostración

- Autenticación habilitada.
- Un trabajo concurrente y cola visible.
- Videos temporales con eliminación automática.
- Página de estado y procedimiento manual de recuperación.
- Video y resultados precalculados como respaldo, identificados claramente como tales.

## 12. Recomendación final actual

No comprar todavía un plan superior de SmarterASP ni seleccionar AWS/Google únicamente por precio anunciado. Primero debe completarse el benchmark de video y solicitarse infraestructura al organizador y a la universidad.

Si no hay recursos institucionales, la primera prueba administrada debería realizarse con **Google Cloud Run + Cloud Storage**, una sola instancia/trabajo y límites estrictos. **AWS ECS/Fargate + S3 + SQS** es una buena alternativa cuando exista experiencia o créditos AWS. **Cloudflare Tunnel** debe conservarse como plan B para el hackathon. SmarterASP W1000 puede seguir alojando componentes livianos, pero no debe ejecutar la inferencia actual.

La arquitectura objetivo debe ser híbrida: inferencia centralizada para completar el POC rápidamente y, posteriormente, evaluación de inferencia a bordo del autobús con publicación de metadatos por 5G hacia una API central consumida por la app móvil.

## Referencias oficiales consultadas

- [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
- [Planes compartidos de SmarterASP.NET](https://www.smarterasp.net/hosting_plans)
- [Tareas programadas de SmarterASP.NET](https://www.smarterasp.net/support/kb/a2385/how-to-schedule-a-task.aspx)
- [VPS de SmarterASP.NET](https://www.smarterasp.net/vps)
- [Google Cloud Run: producto y precios](https://cloud.google.com/run)
- [Precios detallados de Cloud Run](https://cloud.google.com/run/pricing)
- [Límites de Cloud Run](https://cloud.google.com/run/quotas)
- [GPU para trabajos de Cloud Run](https://cloud.google.com/run/docs/configuring/jobs/gpu)
- [Máximo de instancias de Cloud Run](https://cloud.google.com/run/docs/configuring/max-instances)
- [Presupuestos de Google Cloud](https://cloud.google.com/billing/docs/how-to/budgets)
- [Créditos educativos de Google Cloud](https://cloud.google.com/edu/faculty)
- [Precios de AWS Fargate](https://aws.amazon.com/fargate/pricing/)
- [Acciones de AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html)
- [AWS Educate](https://aws.amazon.com/education/awseducate/)

