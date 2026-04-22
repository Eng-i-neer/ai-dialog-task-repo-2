from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json
import os

app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'mindmaps.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class MindMap(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, default='未命名思维导图')
    data = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'data': json.loads(self.data),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }

@app.route('/api/mindmaps', methods=['GET'])
def get_all_mindmaps():
    mindmaps = MindMap.query.order_by(MindMap.updated_at.desc()).all()
    return jsonify([mindmap.to_dict() for mindmap in mindmaps])

@app.route('/api/mindmaps/<int:mindmap_id>', methods=['GET'])
def get_mindmap(mindmap_id):
    mindmap = MindMap.query.get_or_404(mindmap_id)
    return jsonify(mindmap.to_dict())

@app.route('/api/mindmaps', methods=['POST'])
def create_mindmap():
    data = request.get_json()
    
    if not data or 'data' not in data:
        return jsonify({'error': 'Invalid data'}), 400
    
    name = data.get('name', '未命名思维导图')
    mindmap_data = json.dumps(data['data'])
    
    new_mindmap = MindMap(name=name, data=mindmap_data)
    db.session.add(new_mindmap)
    db.session.commit()
    
    return jsonify(new_mindmap.to_dict()), 201

@app.route('/api/mindmaps/<int:mindmap_id>', methods=['PUT'])
def update_mindmap(mindmap_id):
    mindmap = MindMap.query.get_or_404(mindmap_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid data'}), 400
    
    if 'name' in data:
        mindmap.name = data['name']
    if 'data' in data:
        mindmap.data = json.dumps(data['data'])
    
    db.session.commit()
    return jsonify(mindmap.to_dict())

@app.route('/api/mindmaps/<int:mindmap_id>', methods=['DELETE'])
def delete_mindmap(mindmap_id):
    mindmap = MindMap.query.get_or_404(mindmap_id)
    
    db.session.delete(mindmap)
    db.session.commit()
    
    return jsonify({'message': 'MindMap deleted successfully'}), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'MindMap API is running'})

with app.app_context():
    db.create_all()
    print("Database created successfully!")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
