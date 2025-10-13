"""
Test para verificar el endpoint /auth/me del backend
"""
import requests

def test_auth_me_endpoint():
    """Prueba el endpoint de usuario actual"""
    
    # Configurar la URL
    base_url = "http://localhost:3000/auth/me"
    
    # Token de ejemplo (deberías reemplazar esto con un token real)
    # Para obtener un token real, primero necesitas hacer login
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNjc0MDAwLCJpYXQiOjE3Mjg5MTIwMDAsImlzcy6..."  # Token de ejemplo
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        print("🔍 Probando endpoint /auth/me...")
        response = requests.get(base_url, headers=headers)
        
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            print("✅ Respuesta exitosa!")
            print(f"📧 Email: {user_data.get('email', 'No disponible')}")
            print(f"🆔 ID: {user_data.get('id', 'No disponible')}")
            
            profile = user_data.get('profile')
            if profile:
                print(f"👤 Nombre: {profile.get('nombre', 'No disponible')}")
                print(f"📋 Perfil completo: {profile}")
            else:
                print("⚠️ No se encontró perfil del usuario")
                
        elif response.status_code == 401:
            print("❌ Token inválido o expirado")
            print("💡 Necesitas hacer login primero para obtener un token válido")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Respuesta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ No se pudo conectar al servidor.")
        print("💡 Asegúrate de que el servidor NestJS esté corriendo en http://localhost:3000")
        print("💡 Comando para iniciar: npm run start:dev")
    except Exception as e:
        print(f"💥 Error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Test del sistema de autenticación")
    print("=" * 50)
    test_auth_me_endpoint()