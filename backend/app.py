from flask import Flask, request, jsonify, send_from_directory, send_file, session, redirect
from flask_cors import CORS
from pathlib import Path
import os
import zipfile
import tempfile
import functools
from backend.config import Config
from backend.user_manager import UserManager
from backend.question_parser import QuestionParser
from backend.paper_generator import PaperGenerator

# 初始化配置
Config.init_dirs()

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.secret_key = 'auto-paper-system-secret-key-2024'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_PERMANENT'] = False

CORS(app, supports_credentials=True, origins=['http://localhost:5000', 'http://localhost:8000'])

# 登录验证装饰器
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if not session.get('logged_in'):
            if request.path.startswith('/api/'):
                return jsonify({'error': '未登录'}), 401
            return redirect('/')
        return view(**kwargs)
    return wrapped_view

# 管理员权限装饰器
def admin_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': '未登录'}), 401
        if session.get('role') != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return view(**kwargs)
    return wrapped_view

@app.route('/')
def index():
    """登录页面"""
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/main')
def main():
    """主界面"""
    if not session.get('logged_in'):
        return redirect('/')
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    """登录API"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    print(f"Login attempt: username={username}, password={password}")
    
    # 验证用户名和密码
    user = UserManager.verify_login(username, password)
    if user:
        session['logged_in'] = True
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        session.permanent = False
        print(f"Login successful: {user}")
        return jsonify({
            'success': True, 
            'message': '登录成功',
            'username': user['username'],
            'role': user['role']
        })
    else:
        print("Login failed")
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """登出API"""
    session.clear()
    return jsonify({'success': True, 'message': '已登出'})

@app.route('/api/current-user', methods=['GET'])
@login_required
def get_current_user():
    """获取当前用户信息"""
    return jsonify({
        'user_id': session.get('user_id'),
        'username': session.get('username'),
        'role': session.get('role')
    })

# 用户管理API (仅管理员)
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def list_users():
    """获取所有用户列表"""
    users = UserManager.load_users()
    # 移除密码字段
    for user in users:
        user.pop('password', None)
    return jsonify({'users': users})

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    """创建新用户"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    
    # 检查密码强度
    import re
    is_strong, message = UserManager.check_password_strength(password)
    if not is_strong:
        return jsonify({'error': '密码强度不符合要求', 'message': message}), 400
    
    user = UserManager.create_user(username, password, role)
    if user:
        user.pop('password', None)
        return jsonify({'success': True, 'user': user})
    else:
        return jsonify({'error': '用户名已存在'}), 400

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """删除用户"""
    if user_id == session.get('user_id'):
        return jsonify({'error': '不能删除当前登录的用户'}), 400
    
    success = UserManager.delete_user(user_id, delete_files=True)
    if success:
        return jsonify({'success': True, 'message': '用户已删除'})
    else:
        return jsonify({'error': '删除用户失败'}), 400

@app.route('/api/admin/users/<user_id>/reset-password', methods=['POST'])
@admin_required
def reset_password(user_id):
    """重置用户密码"""
    data = request.json
    new_password = data.get('password')
    
    if not new_password:
        return jsonify({'error': '新密码不能为空'}), 400
    
    # 检查密码强度
    import re
    is_strong, message = UserManager.check_password_strength(new_password)
    if not is_strong:
        return jsonify({'error': '密码强度不符合要求', 'message': message}), 400
    
    success = UserManager.reset_password(user_id, new_password)
    if success:
        return jsonify({'success': True, 'message': '密码重置成功'})
    else:
        return jsonify({'error': '重置密码失败'}), 400

@app.route('/api/admin/users/<user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    """更新用户角色"""
    data = request.json
    new_role = data.get('role')
    
    success = UserManager.update_user_role(user_id, new_role)
    if success:
        return jsonify({'success': True, 'message': '角色更新成功'})
    else:
        return jsonify({'error': '更新角色失败'}), 400

@app.route('/api/bank/structure')
@login_required
def get_bank_structure():
    """获取当前用户的题库目录结构"""
    structure = {}
    user_id = session.get('user_id')
    user_dir = Config.get_user_dir(user_id)
    
    if not user_dir.exists():
        return jsonify(structure)
    
    for subject in user_dir.iterdir():
        if subject.is_dir():
            subject_name = subject.name
            structure[subject_name] = {}
            
            # 扫描题型目录
            for qtype in subject.iterdir():
                if qtype.is_dir() and qtype.name in Config.QUESTION_TYPES:
                    type_name = qtype.name
                    structure[subject_name][type_name] = []
                    
                    # 扫描章节
                    for chapter in qtype.iterdir():
                        if chapter.is_dir():
                            chapter_data = {
                                'name': chapter.name,
                                'topics': []
                            }
                            
                            # 扫描考点文件
                            for topic_file in chapter.glob("*.md"):
                                count = QuestionParser.count_questions_in_file(topic_file)
                                if count > 0:
                                    chapter_data['topics'].append({
                                        'name': topic_file.stem,
                                        'file_path': str(topic_file.relative_to(Config.BANK_ROOT)).replace('\\', '/'),
                                        'count': count
                                    })
                            
                            if chapter_data['topics']:
                                structure[subject_name][type_name].append(chapter_data)

    return jsonify(structure)

@app.route('/<path:path>')
def serve_static(path):
    """提供静态文件"""
    return send_from_directory(app.static_folder, path)

@app.route('/api/bank/questions')
@login_required
def get_questions():
    """获取指定文件的题目"""
    file_path = request.args.get('path')
    if not file_path:
        return jsonify({'error': '缺少文件路径'}), 400
    
    user_id = session.get('user_id')
    user_dir = Config.get_user_dir(user_id)
    
    print(f"调试信息: user_id={user_id}, user_dir={user_dir}")
    
    # 直接构建完整路径，不做路径检查
    full_path = user_dir / file_path
    print(f"调试信息: file_path={file_path}, full_path={full_path}")
    
    # 检查文件是否存在
    if not full_path.exists():
        print(f"文件不存在: {full_path}")
        return jsonify({'error': '文件不存在'}), 404
    
    if not full_path.is_file():
        print(f"不是文件: {full_path}")
        return jsonify({'error': '无效的文件路径'}), 404
    
    questions = QuestionParser.parse_question_file(full_path)
    return jsonify({
        'questions': questions,
        'count': len(questions)
    })

@app.route('/api/templates', methods=['GET'])
@login_required
def list_templates():
    """获取当前用户的模板列表，支持按科目筛选"""
    subject = request.args.get('subject', '')
    user_id = session.get('user_id')
    
    print(f"用户 {user_id} 请求模板列表，科目: {subject}")
    templates = PaperGenerator.list_templates(Config.TEMPLATE_DIR, user_id, subject)
    return jsonify({'templates': templates})

@app.route('/api/templates/<name>', methods=['GET'])
@login_required
def get_template(name):
    """获取模板内容"""
    user_id = session.get('user_id')
    
    # 检查模板是否属于当前用户
    if not name.startswith(f"{user_id}_"):
        return jsonify({'error': '无权访问该模板'}), 403
    
    template = PaperGenerator.load_template(name, Config.TEMPLATE_DIR)
    if not template:
        return jsonify({'error': '模板不存在'}), 404
    return jsonify(template)

@app.route('/api/templates/save', methods=['POST'])
@login_required
def save_template():
    """保存模板"""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({'error': '缺少模板名称'}), 400
    
    user_id = session.get('user_id')
    data['user_id'] = user_id
    
    success = PaperGenerator.save_template(data, Config.TEMPLATE_DIR, user_id)
    if success:
        return jsonify({'success': True, 'message': '模板保存成功'})
    else:
        return jsonify({'error': '模板保存失败'}), 500

@app.route('/api/templates/<name>', methods=['DELETE'])
@login_required
def delete_template(name):
    """删除模板"""
    user_id = session.get('user_id')
    
    # 检查模板是否属于当前用户
    if not name.startswith(f"{user_id}_"):
        return jsonify({'error': '无权删除该模板'}), 403
    
    try:
        # 构建模板文件路径
        template_path = Config.TEMPLATE_DIR / f"{name}.json"
        
        if not template_path.exists():
            return jsonify({'error': '模板不存在'}), 404
        
        # 删除模板文件
        template_path.unlink()
        
        return jsonify({'success': True, 'message': '模板删除成功'})
    except Exception as e:
        print(f"删除模板失败: {e}")
        return jsonify({'error': f'删除模板失败: {str(e)}'}), 500        

@app.route('/api/paper/generate', methods=['POST'])
@login_required
def generate_paper():
    """生成单套试卷"""
    data = request.json
    
    required_fields = ['title', 'subject', 'sections']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必要字段: {field}'}), 400
    
    total_score = sum(section.get('total_score', 0) for section in data['sections'])
    data['total_score'] = total_score
    data['user_id'] = session.get('user_id')
    
    try:
        result = PaperGenerator.save_paper_files(data, Config.OUTPUT_DIR, session.get('user_id'))
        
        return jsonify({
            'success': True,
            'message': '试卷生成成功',
            'files': result,
            'total_score': total_score
        })
    except Exception as e:
        print(f"生成试卷失败: {e}")
        return jsonify({
            'success': False,
            'error': '生成试卷失败',
            'message': f'生成试卷时发生错误: {str(e)}'
        }), 500

@app.route('/api/paper/generate-multiple', methods=['POST'])
@login_required
def generate_multiple_papers():
    """生成多套试卷"""
    data = request.json
    
    required_fields = ['title', 'subject', 'sections']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必要字段: {field}'}), 400
    
    paper_count = data.get('paper_count', 1)
    if paper_count < 1 or paper_count > 10:
        return jsonify({'error': '组卷套数必须在1-10之间'}), 400
    
    total_score = sum(section.get('total_score', 0) for section in data['sections'])
    data['total_score'] = total_score
    data['user_id'] = session.get('user_id')
    
    try:
        result = PaperGenerator.save_multiple_paper_files(data, Config.OUTPUT_DIR, paper_count, session.get('user_id'))
        
        return jsonify({
            'success': True,
            'message': f'成功生成 {paper_count} 套试卷',
            'folder': result['folder'],
            'folder_name': result['folder_name'],
            'files': result['files'],
            'total_score': total_score,
            'paper_count': paper_count
        })
    except Exception as e:
        print(f"生成多套试卷失败: {e}")
        return jsonify({
            'success': False,
            'error': '生成多套试卷失败',
            'message': f'生成多套试卷时发生错误: {str(e)}'
        }), 500

@app.route('/api/paper/download-word/<path:folder_name>', methods=['GET'])
@login_required
def download_word_papers(folder_name):
    """打包下载指定文件夹中的所有Word版试卷文件"""
    try:
        user_id = session.get('user_id')
        
        # 安全检查：文件夹名应该以用户ID开头，防止路径遍历攻击
        if not folder_name.startswith(f"{user_id}_"):
            return jsonify({'error': '无权访问该文件夹'}), 403
        
        # 防止路径遍历攻击：确保文件夹路径是OUTPUT_DIR的直接子目录
        folder_path = Config.OUTPUT_DIR / folder_name
        try:
            # 解析路径并确保它在OUTPUT_DIR内
            resolved_path = folder_path.resolve()
            output_dir_resolved = Config.OUTPUT_DIR.resolve()
            if not resolved_path.is_relative_to(output_dir_resolved):
                return jsonify({'error': '无效的文件夹路径'}), 403
        except Exception:
            return jsonify({'error': '无效的文件夹路径'}), 403
        
        if not folder_path.exists() or not folder_path.is_dir():
            return jsonify({'error': '文件夹不存在'}), 404
        
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        zip_path = temp_zip.name
        temp_zip.close()
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            word_files_found = False
            # 查找所有md文件并动态转换为Word
            for md_path in folder_path.glob('*.md'):
                if md_path.is_file():
                    # 动态转换为Word
                    from backend.paper_generator import PaperGenerator
                    docx_path = PaperGenerator.convert_to_word(md_path)
                    if docx_path and docx_path.exists():
                        arcname = docx_path.name
                        zipf.write(docx_path, arcname)
                        word_files_found = True
                        print(f"添加Word文件: {arcname}")
                        # 删除临时生成的Word文件
                        try:
                            docx_path.unlink()
                        except:
                            pass
            
            if not word_files_found:
                os.unlink(zip_path)
                return jsonify({'error': '该文件夹中没有可转换的试卷文件'}), 404
        
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=f"{folder_name}_Word版.zip",
            mimetype='application/zip'
        )
    except Exception as e:
        print(f"打包下载失败: {e}")
        error_message = f'打包下载失败: {str(e)}'
        return jsonify({'error': error_message}), 500
    finally:
        try:
            os.unlink(zip_path)
        except:
            pass

@app.route('/api/subjects')
@login_required
def get_subjects():
    """获取当前用户的科目列表"""
    subjects = []
    user_id = session.get('user_id')
    user_dir = Config.get_user_dir(user_id)
    
    if user_dir.exists():
        for item in user_dir.iterdir():
            if item.is_dir():
                subjects.append(item.name)
    
    subjects.sort(reverse=True)
    return jsonify({'subjects': subjects})

@app.route('/api/bank/save-question', methods=['POST'])
@login_required
def save_question():
    """保存题目"""
    data = request.json
    print(f"保存题目 - 请求数据: {data}")
    if not data or 'content' not in data or 'path' not in data or 'questionIndex' not in data:
        print(f"保存题目 - 错误: 缺少必要字段")
        print(f"保存题目 - data: {data}")
        return jsonify({'error': '缺少必要字段'}), 400
    
    content = data['content']
    file_path = data['path']
    question_index = data['questionIndex']
    
    print(f"保存题目 - content: {content[:100] if content else 'None'}...")
    print(f"保存题目 - path: {file_path}")
    print(f"保存题目 - questionIndex: {question_index}")
    
    user_id = session.get('user_id')
    user_dir = Config.get_user_dir(user_id)
    
    print(f"保存题目 - user_id: {user_id}")
    print(f"保存题目 - user_dir: {user_dir}")
    
    # 构建完整路径
    full_path = user_dir / file_path
    print(f"保存题目 - full_path: {full_path}")
    
    # 检查文件是否存在
    if not full_path.exists():
        print(f"保存题目 - 错误: 文件不存在")
        return jsonify({'error': '文件不存在'}), 404
    
    if not full_path.is_file():
        print(f"保存题目 - 错误: 无效的文件路径")
        return jsonify({'error': '无效的文件路径'}), 400
    
    try:
        # 读取原文件内容
        with open(full_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # 按 '---' 分割题目
        questions = [q.strip() for q in original_content.split('---') if q.strip()]
        print(f"保存题目 - 原文件题目数量: {len(questions)}")
        print(f"保存题目 - 要替换的题目索引: {question_index}")
        
        if question_index >= 0:
            # 检查索引是否有效
            if question_index >= len(questions):
                print(f"保存题目 - 错误: 题目索引无效")
                return jsonify({'error': '题目索引无效'}), 400
            
            # 替换对应题目的内容
            questions[question_index] = content.strip()
        else:
            # 新增题目，添加到文件最后
            if questions:
                # 如果文件不为空，添加分割线
                questions.append(content.strip())
            else:
                # 如果文件为空，直接添加
                questions = [content.strip()]
        
        # 重新组合文件内容
        new_content = '\n\n---\n\n'.join(questions)
        
        # 写入文件
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        # 清除缓存，确保下次加载时重新解析
        cache_key = str(full_path)
        if cache_key in QuestionParser._question_cache:
            del QuestionParser._question_cache[cache_key]
        
        print(f"保存题目 - 成功保存到: {full_path}")
        return jsonify({'success': True, 'message': '题目保存成功'})
    except Exception as e:
        print(f"保存题目失败: {e}")
        return jsonify({'error': f'保存题目失败: {str(e)}'}), 500

@app.route('/api/question-types')
@login_required
def get_question_types():
    """获取题型列表"""
    return jsonify({'types': Config.QUESTION_TYPES})

@app.route('/api/health')
@login_required
def health_check():
    """健康检查"""
    return jsonify({'status': 'ok', 'service': 'auto-paper-system'})

if __name__ == '__main__':
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)