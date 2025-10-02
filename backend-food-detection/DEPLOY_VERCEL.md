# Instrucciones de Despliegue en Vercel

## Archivos eliminados y limpieza realizada

### Archivos de prueba eliminados:
- `test_endpoints.py`
- `test_gemini.py`
- `test_optimization.py`
- `test_spanish_responses.py`
- `test_unlimited_detection.py`

### Archivos de base de datos eliminados:
- `food_tracker.db`
- `init_db.py`

### Archivos de documentación eliminados:
- `ARQUITECTURA_SIMPLIFICADA.md`
- `CAPACIDADES_ILIMITADAS.md`
- `GEMINI_SETUP_COMPLETE.md`
- `OPTIMIZACION_TOKENS.md`
- `OPTIMIZATION_STRATEGIES.md`
- `RESPUESTAS_ESPAÑOL.md`

### Carpetas eliminadas:
- `alembic/` (migraciones de base de datos)
- `docs/` (documentación)

### Archivos de imagen de prueba eliminados:
- `ceviche.png`

## Archivos creados para Vercel:

1. **vercel.json** - Configuración de despliegue
2. **.vercelignore** - Archivos a excluir del despliegue
3. **.gitignore** - Archivos a excluir del repositorio
4. **README-VERCEL.md** - Documentación específica para Vercel

## Pasos para desplegar en Vercel:

### 1. Preparación
```bash
# Instalar CLI de Vercel
npm i -g vercel

# Hacer login en Vercel
vercel login
```

### 2. Despliegue
```bash
# En la raíz del proyecto
vercel

# Seguir las instrucciones:
# - Set up and deploy? [Y/n] Y
# - Which scope? (seleccionar tu cuenta)
# - Link to existing project? [y/N] N
# - What's your project's name? backend-comidas
# - In which directory is your code located? ./
```

### 3. Configurar variables de entorno en Vercel
En el dashboard de Vercel, ir a Settings > Environment Variables y agregar:

- `GEMINI_API_KEY`: Tu API key de Google Gemini
- `CORS_ORIGINS`: 
  - Para aplicaciones web: `https://tu-frontend.vercel.app,https://otro-dominio.com`
  - Para aplicaciones móviles (Flutter): `*` (más permisivo)
  - Para desarrollo: `http://localhost:3000,http://localhost:8080`

**Nota sobre CORS y aplicaciones móviles:**
- Las aplicaciones Flutter móviles NO están sujetas a restricciones CORS
- Puedes usar `CORS_ORIGINS=*` sin problemas de seguridad
- CORS solo aplica a navegadores web, no a aplicaciones nativas

### 4. Verificar el despliegue
Una vez desplegado, Vercel te dará una URL como:
`https://backend-comidas-xxx.vercel.app`

Puedes probar los endpoints:
- `GET /` - Información del sistema
- `GET /docs` - Documentación interactiva
- `POST /api/v1/ai/test-detection` - Detección de alimentos

## Estructura final del proyecto:

```
backend_comidas/
├── .env                    # Variables de entorno locales
├── .env.example           # Ejemplo de variables de entorno
├── .gitignore             # Archivos excluidos del repositorio
├── .vercelignore          # Archivos excluidos del despliegue
├── README.md              # Documentación principal
├── README-VERCEL.md       # Documentación específica para Vercel
├── requirements.txt       # Dependencias de Python
├── run.py                 # Script para ejecutar localmente
├── vercel.json           # Configuración de Vercel
├── app/                  # Código de la aplicación
│   ├── main.py           # Punto de entrada
│   ├── ai/               # Módulos de IA
│   ├── api/              # Endpoints de la API
│   ├── core/             # Configuración
│   ├── models/           # Modelos de datos
│   ├── schemas/          # Esquemas de validación
│   └── services/         # Servicios
├── test_image_detection.py  # Script de prueba (mantener para desarrollo)
├── test_json_response.py    # Script de prueba (mantener para desarrollo)
└── uploads/              # Carpeta para archivos subidos
    └── .gitkeep
```

## Notas importantes:

1. **API Key de Gemini**: Es obligatoria para que funcione la detección
2. **CORS**: Configurar correctamente para permitir requests desde tu frontend
3. **Límites de Vercel**: Plan gratuito tiene límites de ejecución y ancho de banda
4. **Archivos de prueba**: Se mantuvieron `test_image_detection.py` y `test_json_response.py` para desarrollo local

## Comandos útiles después del despliegue:

```bash
# Ver logs en tiempo real
vercel logs

# Redesplegar
vercel --prod

# Ver información del proyecto
vercel inspect
```