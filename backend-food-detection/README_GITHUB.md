# Food Detection API 🍽️

API especializada en detección de alimentos usando Google Gemini 1.5 Flash, optimizada para aplicaciones móviles Flutter.

## 🚀 Despliegue rápido en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Jeysson16/backend-comidas&env=GEMINI_API_KEY&envDescription=API%20Key%20de%20Google%20Gemini%20requerida&envLink=https://makersuite.google.com/app/apikey)

## 📱 Características

- ✅ **Detección avanzada de alimentos** con IA
- ✅ **Análisis nutricional automático**
- ✅ **Estimación de porciones** por peso
- ✅ **API optimizada** para aplicaciones móviles
- ✅ **CORS configurado** para Flutter
- ✅ **Respuestas estructuradas** en JSON
- ✅ **Documentación interactiva** con Swagger

## 🛠️ Tecnologías

- **Backend**: FastAPI + Python 3.11
- **IA**: Google Gemini 1.5 Flash
- **Despliegue**: Vercel
- **Documentación**: Swagger UI automática

## 📋 Requisitos

- Python 3.11+
- API Key de Google Gemini ([Obtener aquí](https://makersuite.google.com/app/apikey))

## 🚀 Instalación local

```bash
# Clonar repositorio
git clone https://github.com/Jeysson16/backend-comidas.git
cd backend-comidas

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar tu GEMINI_API_KEY

# Ejecutar servidor
python run.py
```

La API estará disponible en: `http://localhost:8000`

## 🌐 Despliegue en Vercel desde GitHub

### Opción 1: Un click (Recomendado)
1. Haz fork de este repositorio
2. Click en el botón "Deploy with Vercel" arriba
3. Conecta tu cuenta de GitHub
4. Agrega tu `GEMINI_API_KEY`
5. ¡Listo! 🎉

### Opción 2: Manual
1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Configura las variables de entorno
5. Despliega automáticamente

## 🔑 Variables de entorno requeridas

```bash
GEMINI_API_KEY=tu_api_key_aqui
CORS_ORIGINS=*  # Para aplicaciones móviles
ENVIRONMENT=production
DEBUG=false
```

## 📊 Estructura de respuesta

### Endpoint principal: `POST /api/v1/ai/test-detection`

```json
{
  "dish_identification": {
    "name": "Ensalada mixta",
    "confidence": 0.95,
    "cuisine_type": "Mediterránea"
  },
  "detections": [
    {
      "class": "lechuga",
      "confidence": 0.92,
      "bbox": [0.1, 0.2, 0.8, 0.7],
      "estimated_weight": 50,
      "nutrition": {
        "calories": 8,
        "protein": 0.9,
        "carbs": 1.5,
        "fat": 0.1,
        "fiber": 1.0
      },
      "nutrition_per_100g": {
        "calories": 15,
        "protein": 1.8,
        "carbs": 3.0,
        "fat": 0.2,
        "fiber": 2.0
      }
    }
  ],
  "meal_analysis": {
    "total_calories": 150,
    "total_protein": 8.5,
    "total_carbs": 20.0,
    "total_fat": 5.2,
    "health_score": 8.5,
    "recommendations": ["Excelente fuente de fibra", "Bajo en calorías"]
  }
}
```

## 🔗 Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Información del sistema |
| `GET` | `/docs` | Documentación interactiva |
| `GET` | `/health` | Estado de salud |
| `POST` | `/api/v1/ai/test-detection` | Detección de alimentos |
| `GET` | `/api/v1/ai/supported-foods` | Alimentos soportados |

## 📱 Uso con Flutter

```dart
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'https://tu-backend.vercel.app';
  
  Future<Map<String, dynamic>> detectFood(File imageFile) async {
    var request = http.MultipartRequest(
      'POST', 
      Uri.parse('$baseUrl/api/v1/ai/test-detection')
    );
    
    request.files.add(
      await http.MultipartFile.fromPath('file', imageFile.path)
    );
    
    var response = await request.send();
    var responseData = await response.stream.bytesToString();
    
    return json.decode(responseData);
  }
}
```

## 📈 Monitoreo

- **Logs en tiempo real**: Dashboard de Vercel
- **Métricas de uso**: Analytics integrado
- **Health checks**: Endpoint `/health`
- **Documentación**: Siempre actualizada en `/docs`

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.

---

**Desarrollado con ❤️ para aplicaciones móviles Flutter**