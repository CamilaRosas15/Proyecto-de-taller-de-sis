# Despliegue en Vercel - Guía de Solución de Problemas

## Problemas Resueltos en los Últimos Commits

### Problema Principal
Los últimos 3 commits introdujeron dependencias que no son compatibles con Vercel:
- `opencv-python` (muy pesada para serverless)
- `pyzbar` (requiere librerías del sistema)

### Solución Implementada

#### 1. Imports Condicionales
```python
# En barcode_detector.py
try:
    import cv2
    import numpy as np
    from pyzbar import pyzbar
    BARCODE_LIBS_AVAILABLE = True
except ImportError:
    BARCODE_LIBS_AVAILABLE = False
```

#### 2. Funcionalidad Adaptativa
- **Desarrollo Local**: Detección automática de códigos de barras funciona
- **Producción (Vercel)**: Solo entrada manual de códigos de barras

#### 3. Requirements Optimizados
- `requirements.txt`: Solo dependencias compatibles con Vercel
- `requirements-dev.txt`: Todas las dependencias para desarrollo local

#### 4. Configuración de Vercel Mejorada
- `maxLambdaSize`: Aumentado a 50MB
- `maxDuration`: 30 segundos para funciones
- Variables de entorno configuradas

## Archivos Modificados

### Archivos de Configuración
- ✅ `vercel.json` - Configuración optimizada
- ✅ `requirements.txt` - Sin opencv/pyzbar
- ✅ `requirements-dev.txt` - Con todas las dependencias
- ✅ `.vercelignore` - Excluye archivos innecesarios

### Código Fuente
- ✅ `app/ai/barcode_detector.py` - Imports condicionales
- ✅ `BARCODE_API.md` - Documentación actualizada

## Funcionalidades por Entorno

### Desarrollo Local (requirements-dev.txt)
```bash
pip install -r requirements-dev.txt
```
- ✅ Detección automática de códigos de barras
- ✅ Entrada manual de códigos
- ✅ Todas las funcionalidades

### Producción Vercel (requirements.txt)
```bash
pip install -r requirements.txt
```
- ❌ Detección automática NO disponible
- ✅ Entrada manual SÍ funciona
- ✅ OpenFoodFacts + Gemini AI funcionan

## Variables de Entorno en Vercel

### Requeridas
```
GEMINI_API_KEY=tu_api_key_aqui
```

### Opcionales
```
UPC_DATABASE_API_KEY=tu_api_key_upc
ENVIRONMENT=production
DEBUG=false
```

## Endpoints Afectados

### `/api/v1/ai/barcode-analysis`
- **Antes**: Requería imagen obligatoriamente
- **Ahora**: Acepta imagen O código manual
- **Vercel**: Solo código manual funciona

### Response en Vercel
```json
{
  "success": true,
  "barcode": "7501234567890",
  "detection_method": "manual",
  "barcode_detection_available": false,
  "product_name": "Producto encontrado",
  "source": "openfoodfacts"
}
```

## Instrucciones de Despliegue

### 1. Verificar Archivos
```bash
# Verificar que estos archivos existen:
ls requirements.txt
ls vercel.json
ls .vercelignore
```

### 2. Commit y Push
```bash
git add .
git commit -m "Fix: Compatibilidad con Vercel - imports condicionales"
git push origin main
```

### 3. Configurar Variables en Vercel
1. Ir a Vercel Dashboard
2. Seleccionar el proyecto
3. Settings → Environment Variables
4. Agregar `GEMINI_API_KEY`

### 4. Redeploy
El despliegue debería funcionar automáticamente después del push.

## Testing en Vercel

### Endpoint de Salud
```
GET https://tu-app.vercel.app/health
```

### Test de Código de Barras
```bash
curl -X POST https://tu-app.vercel.app/api/v1/ai/barcode-analysis \
  -F "manual_barcode=7501234567890"
```

## Troubleshooting

### Si sigue fallando:
1. Verificar logs en Vercel Dashboard
2. Confirmar que `GEMINI_API_KEY` está configurada
3. Verificar que no hay imports de opencv/pyzbar sin try/except

### Logs Útiles
- Build logs: Mostrarán errores de dependencias
- Function logs: Mostrarán errores de runtime

## Diferencias de UX

### Antes (Desarrollo)
1. Usuario sube imagen
2. Sistema detecta código automáticamente
3. Busca información

### Ahora (Producción)
1. Usuario ingresa código manualmente
2. Sistema busca información directamente
3. Más rápido, menos dependencias

## Beneficios de la Solución

- ✅ Compatible con Vercel
- ✅ Menor tamaño de deployment
- ✅ Más rápido en producción
- ✅ Funcionalidad completa mantenida
- ✅ Fallback graceful