# 🚀 Despliegue en Vercel desde GitHub

## Pasos para desplegar desde GitHub:

### 1. 📁 Preparar el repositorio

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit inicial
git commit -m "Initial commit: Food Detection API ready for Vercel"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/backend-comidas.git
git branch -M main
git push -u origin main
```

### 2. 🔗 Conectar GitHub con Vercel

1. Ve a [vercel.com](https://vercel.com) y haz login
2. Click en "New Project"
3. Selecciona "Import Git Repository"
4. Conecta tu cuenta de GitHub si no está conectada
5. Busca tu repositorio `backend-comidas`
6. Click en "Import"

### 3. ⚙️ Configuración automática en Vercel

Vercel detectará automáticamente:
- ✅ Framework: Python
- ✅ Build Command: (automático)
- ✅ Output Directory: (automático)
- ✅ Install Command: `pip install -r requirements.txt`

### 4. 🔑 Variables de entorno en Vercel

En la página de configuración del proyecto, agregar:

```
GEMINI_API_KEY=AIzaSyAeDzo48j9aduj0aOsucl413MZ9cqw-5IY
CORS_ORIGINS=*
ENVIRONMENT=production
DEBUG=false
```

### 5. 🚀 Despliegue automático

- ✅ Cada push a `main` desplegará automáticamente
- ✅ Preview deployments para otras ramas
- ✅ Logs en tiempo real
- ✅ Rollback automático si hay errores

## 📋 Comandos Git para subir:

```bash
# Clonar si es un repo existente
git clone https://github.com/TU_USUARIO/backend-comidas.git
cd backend-comidas

# O si ya tienes el proyecto local:
git init
git add .
git commit -m "Food Detection API - Ready for production"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/backend-comidas.git
git branch -M main
git push -u origin main
```

## 🔄 Workflow de desarrollo:

```bash
# Hacer cambios
git add .
git commit -m "Descripción de los cambios"
git push

# Vercel desplegará automáticamente
```

## 📊 Ventajas del despliegue desde GitHub:

- ✅ **Despliegue automático** en cada push
- ✅ **Preview deployments** para testing
- ✅ **Rollback fácil** a versiones anteriores
- ✅ **Colaboración** con otros desarrolladores
- ✅ **CI/CD integrado** con Vercel
- ✅ **Logs y monitoreo** automático

## 🌐 URLs después del despliegue:

- **Producción**: `https://backend-comidas-tu-usuario.vercel.app`
- **API Docs**: `https://backend-comidas-tu-usuario.vercel.app/docs`
- **Health Check**: `https://backend-comidas-tu-usuario.vercel.app/health`

## 🔧 Configuración adicional (opcional):

### Archivo `vercel.json` optimizado:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app/main.py"
    }
  ],
  "env": {
    "PYTHONPATH": ".",
    "ENVIRONMENT": "production"
  }
}
```

¡Listo! Con estos pasos tendrás tu API desplegada automáticamente desde GitHub. 🎉