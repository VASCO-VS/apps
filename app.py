from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
from werkzeug.utils import secure_filename

app = Flask(__name__, static_url_path='', static_folder='.')
DB_FILE = 'dados.db'

# Configuração da pasta de uploads
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True) 

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pontos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            tipo TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            imagem TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def home(): return send_from_directory('.', 'index.html')

@app.route('/admin')
def painel_admin(): return send_from_directory('.', 'admin.html')

@app.route('/vitrine')
def pagina_vitrine(): return send_from_directory('.', 'vitrine.html')

@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/pontos', methods=['GET'])
def get_pontos():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM pontos')
    rows = cursor.fetchall()
    conn.close()
    
    pontos = [{'id': r[0], 'titulo': r[1], 'descricao': r[2], 'tipo': r[3], 'lat': r[4], 'lng': r[5], 'imagem': r[6]} for r in rows]
    return jsonify(pontos)

@app.route('/api/pontos', methods=['POST'])
def add_ponto():
    titulo = request.form.get('titulo')
    descricao = request.form.get('descricao')
    tipo = request.form.get('tipo')
    lat = request.form.get('lat')
    lng = request.form.get('lng')
    
    caminho_imagem = ''
    if 'imagem' in request.files:
        file = request.files['imagem']
        if file.filename != '':
            filename = secure_filename(file.filename) 
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath) 
            caminho_imagem = f'/uploads/{filename}' 

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO pontos (titulo, descricao, tipo, lat, lng, imagem)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (titulo, descricao, tipo, float(lat), float(lng), caminho_imagem))
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'sucesso'}), 201

# ==========================================
# NOVAS ROTAS: ATUALIZAR E DELETAR
# ==========================================

@app.route('/api/pontos/<int:id>', methods=['DELETE'])
def delete_ponto(id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Procura a imagem para apagar do servidor
    cursor.execute('SELECT imagem FROM pontos WHERE id = ?', (id,))
    row = cursor.fetchone()
    if row and row[0]:
        caminho_arquivo = row[0].lstrip('/') # Remove a barra inicial para o os.path entender
        if os.path.exists(caminho_arquivo):
            os.remove(caminho_arquivo)
            
    cursor.execute('DELETE FROM pontos WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'sucesso'}), 200

@app.route('/api/pontos/<int:id>', methods=['PUT'])
def update_ponto(id):
    titulo = request.form.get('titulo')
    descricao = request.form.get('descricao')
    tipo = request.form.get('tipo')
    lat = request.form.get('lat')
    lng = request.form.get('lng')
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Se o utilizador enviou uma NOVA imagem, atualiza o arquivo
    if 'imagem' in request.files and request.files['imagem'].filename != '':
        # Apaga a imagem velha
        cursor.execute('SELECT imagem FROM pontos WHERE id = ?', (id,))
        row = cursor.fetchone()
        if row and row[0]:
            caminho_velho = row[0].lstrip('/')
            if os.path.exists(caminho_velho):
                os.remove(caminho_velho)

        # Guarda a nova
        file = request.files['imagem']
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        caminho_imagem = f'/uploads/{filename}'
        
        cursor.execute('''
            UPDATE pontos SET titulo=?, descricao=?, tipo=?, lat=?, lng=?, imagem=? WHERE id=?
        ''', (titulo, descricao, tipo, float(lat), float(lng), caminho_imagem, id))
    else:
        # Se não enviou imagem, atualiza apenas o texto e mantém a imagem antiga
        cursor.execute('''
            UPDATE pontos SET titulo=?, descricao=?, tipo=?, lat=?, lng=? WHERE id=?
        ''', (titulo, descricao, tipo, float(lat), float(lng), id))
        
    conn.commit()
    conn.close()
    return jsonify({'status': 'sucesso'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)