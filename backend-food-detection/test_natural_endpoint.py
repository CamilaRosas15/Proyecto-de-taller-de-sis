"""
Test para el nuevo endpoint de análisis en lenguaje natural
"""
import requests

def test_natural_endpoint():
    """Prueba el endpoint que devuelve respuesta en lenguaje natural directo"""
    
    base_url = "http://localhost:8000/api/v1/ai"
    
    # Ruta a una imagen de ejemplo (puedes cambiar esta ruta)
    image_path = "uploads/OIP.webp"  # Cambiar por tu imagen de pizza
    
    try:
        # Intentar leer la imagen
        try:
            with open(image_path, 'rb') as f:
                image_data = f.read()
        except FileNotFoundError:
            print(f"❌ No se encontró la imagen en: {image_path}")
            print("📝 Usando datos simulados para la prueba...")
            image_data = b"fake_image_data_for_testing"
        
        files = {'file': ('test_image.jpg', image_data, 'image/jpeg')}
        
        print("🚀 Enviando imagen al nuevo endpoint de análisis natural...")
        response = requests.post(f"{base_url}/analyze-food-natural", files=files)
        
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Respuesta exitosa!")
            print("\n" + "="*60)
            print("📝 ANÁLISIS EN LENGUAJE NATURAL:")
            print("="*60)
            print(response.text)
            print("="*60)
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Respuesta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ No se pudo conectar al servidor.")
        print("💡 Asegúrate de que el servidor esté corriendo en http://localhost:8000")
    except Exception as e:
        print(f"💥 Error: {str(e)}")

if __name__ == "__main__":
    test_natural_endpoint()