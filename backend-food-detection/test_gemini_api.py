"""
Script para probar la API de Gemini directamente
"""
import requests
import json
from app.core.config import settings

def test_gemini_api():
    """Prueba básica de la API de Gemini"""
    
    api_key = settings.GEMINI_API_KEY
    print(f"🔑 API Key configurada: {api_key[:10]}...{api_key[-10:] if api_key else 'None'}")
    
    if not api_key:
        print("❌ No hay API key configurada")
        return False
    
    # URL de prueba para Gemini
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    # Payload simple de prueba
    payload = {
        "contents": [{
            "parts": [{"text": "¿Qué es una pizza? Responde en español en formato JSON con la estructura: {\"tipo_comida\": \"pizza\", \"descripcion\": \"descripción breve\"}"}]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 200
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        print("🚀 Enviando solicitud a Gemini...")
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Respuesta exitosa de Gemini!")
            print(f"📝 Respuesta completa: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # Verificar estructura de respuesta
            if "candidates" in result:
                print(f"👥 Candidates encontrados: {len(result['candidates'])}")
                if len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    print(f"🔍 Estructura del candidate: {list(candidate.keys())}")
                    
                    if "content" in candidate:
                        content = candidate["content"]
                        print(f"📄 Estructura del content: {list(content.keys())}")
                        
                        if "parts" in content:
                            parts = content["parts"]
                            print(f"🧩 Parts encontrados: {len(parts)}")
                            if len(parts) > 0:
                                print(f"✍️ Texto de respuesta: {parts[0].get('text', 'No text found')}")
            
            return True
        else:
            print(f"❌ Error en la respuesta: {response.status_code}")
            print(f"📄 Contenido del error: {response.text}")
            return False
            
    except Exception as e:
        print(f"💥 Error en la solicitud: {str(e)}")
        return False

if __name__ == "__main__":
    test_gemini_api()