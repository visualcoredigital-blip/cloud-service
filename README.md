# VisualCoreDigital - Cloud Service (PDF Generator)

Microservicio modular contenedorizado diseñado para correr en **Google Cloud Run** y entornos locales mediante **Docker**. Su función principal actual es conectarse a MongoDB Atlas, recuperar datos de contactos y generar reportes en formato PDF optimizados, subiéndolos automáticamente a Google Cloud Storage.

## 🛠️ Requisitos Previos

Antes de levantar el proyecto, asegúrate de tener instalado:
* **Docker Desktop** y **Docker Compose**
* **Git** 
* Un cliente HTTP como **Postman**

---

## 🚀 Ejecución en Entorno Local (Docker)

El entorno local emula la arquitectura completa de la nube, incluyendo un emulador de Google Pub/Sub y la inyección de credenciales.

### 1. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con tus credenciales (este archivo está protegido por `.gitignore`):

```env
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/VisualCoreDB?retryWrites=true&w=majority

2. Levantar los Contenedores
Para compilar y levantar los servicios en segundo plano, ejecuta en tu terminal:

docker-compose down
docker-compose up --build

El servicio quedará escuchando localmente en el puerto 8081.

Pruebas con Postman (Estructura del Body)
---------------------------------------------
El servicio utiliza un enrutador dinámico central. Para ejecutar la función de generación de PDF, debes enviar una petición HTTP con el formato exacto de un evento de infraestructura.

Configuración de la Petición:
Método: POST
URL: http://localhost:8081/
Headers: Content-Type: application/json
Cuerpo de la Petición (JSON Body):
Selecciona la opción raw y el formato JSON en Postman, luego pega el siguiente payload:
{
  "action": "DOWNLOAD_PDF",
  "exportId": "PruebaLocal-VCD",
  "filter": {}
}

Campo       Tipo            Descripción
---------------------------------------------------------------------
action      String          "Obligatorio. Determina qué función debe
                            ejecutar el enrutador. Para este caso debe ser estrictamente ""DOWNLOAD_PDF""."

exportId    String          Obligatorio. Es el identificador único o
                            prefijo que llevará el nombre del archivo .pdf final en el Bucket de Storage.
filter      Object          "Opcional. Objeto JSON con los criterios
                            de filtrado (por ejemplo, para segmentar qué contactos se incluirán en el reporte). Si se envía vacío {}, procesará todos los registros."
                            