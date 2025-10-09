"""
Test para la nueva respuesta en lenguaje natural
"""
import requests
import json
import base64

def test_natural_language_analysis():
    """Prueba el análisis en lenguaje natural con Gemini"""
    
    api_key = "AIzaSyB22je6jEvVOn8AvqWVMG1_3H9bL_nxJ0o"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    # Crear imagen simulada de pizza para test
    fake_image_data = b"fake_pizza_image_data_for_testing"
    base64_image = base64.b64encode(fake_image_data).decode('utf-8')
    
    prompt = """
    Analiza esta imagen de comida y describe lo que ves de manera natural y amigable en ESPAÑOL.
    
    Estructura tu respuesta de la siguiente manera:

    **🍽️ ¿Qué estoy viendo?**
    Identifica el plato principal y describe brevemente lo que observas en la imagen.

    **🥘 Alimentos detectados:**
    Para cada alimento que veas, menciona:
    - Qué es exactamente
    - Qué tan seguro estás de la identificación (muy seguro/bastante seguro/posiblemente)
    - El tamaño de la porción (pequeña/mediana/grande)
    - Peso estimado en gramos

    **📊 Información nutricional:**
    Para cada alimento, proporciona de manera conversacional:
    - Calorías aproximadas de la porción
    - Contenido de proteínas, carbohidratos y grasas
    - Si tiene fibra significativa
    - Cualquier nutriente destacable

    **🍴 Análisis de la comida:**
    - ¿Qué tipo de comida es? (desayuno/almuerzo/cena/snack)
    - Calorías totales estimadas
    - ¿Está balanceada nutricionalmente?
    - Puntuación de salud del 1 al 10 y por qué

    **💡 Recomendaciones:**
    Da 2-3 consejos amigables sobre:
    - Aspectos positivos de esta comida
    - Qué se podría mejorar
    - Sugerencias para complementar la comida

    **🎯 Resumen rápido:**
    Termina con un resumen de una línea sobre la comida.

    IMPORTANTE: 
    - Usa un tono conversacional y amigable
    - Evita ser demasiado técnico
    - Incluye emojis para hacer la respuesta más visual
    - Sé específico con los números pero explícalos de forma simple
    - Si no estás seguro de algo, dilo honestamente
    """
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64_image
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "topK": 32,
            "topP": 1,
            "maxOutputTokens": 2048,
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        print("🍕 Enviando imagen para análisis en lenguaje natural...")
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Respuesta exitosa!")
            
            if "candidates" in result and len(result["candidates"]) > 0:
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                print("\n" + "="*60)
                print("📝 ANÁLISIS EN LENGUAJE NATURAL:")
                print("="*60)
                print(content)
                print("="*60)
                
                return {
                    "analysis_type": "natural_language",
                    "gemini_analysis": content,
                    "model_used": "gemini-2.0-flash-exp"
                }
                    
            else:
                print("❌ No se encontraron candidates en la respuesta")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"💥 Error: {str(e)}")

if __name__ == "__main__":
    test_natural_language_analysis()