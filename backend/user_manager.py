import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import shutil
import hashlib
from config import Config

class UserManager:
    """用户管理器"""
    
    @staticmethod
    def load_users() -> List[Dict[str, Any]]:
        """加载所有用户"""
        if not Config.USERS_FILE.exists():
            return []
        
        try:
            with open(Config.USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('users', [])
        except Exception as e:
            print(f"加载用户失败: {e}")
            return []
    
    @staticmethod
    def save_users(users: List[Dict[str, Any]]) -> bool:
        """保存用户列表"""
        try:
            with open(Config.USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump({'users': users}, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"保存用户失败: {e}")
            return False
    
    @staticmethod
    def find_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """根据用户名查找用户"""
        users = UserManager.load_users()
        for user in users:
            if user['username'] == username:
                return user
        return None
    
    @staticmethod
    def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """根据用户ID查找用户"""
        users = UserManager.load_users()
        for user in users:
            if user['id'] == user_id:
                return user
        return None
    
    @staticmethod
    def hash_password(password: str) -> str:
        """生成密码哈希"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def check_password_strength(password: str) -> tuple[bool, str]:
        """检查密码强度
        返回：(是否通过, 提示信息)
        """
        if len(password) < 6:
            return False, '密码长度至少为6位'
        if len(password) > 20:
            return False, '密码长度不能超过20位'
        if not re.search(r'[a-zA-Z]', password):
            return False, '密码必须包含字母'
        if not re.search(r'[0-9]', password):
            return False, '密码必须包含数字'
        return True, '密码强度符合要求'
    
    @staticmethod
    def create_user(username: str, password: str, role: str = 'user') -> Optional[Dict[str, Any]]:
        """创建新用户"""
        # 检查密码强度
        import re
        is_strong, message = UserManager.check_password_strength(password)
        if not is_strong:
            print(f"密码强度检查失败: {message}")
            return None
        
        # 检查用户名是否已存在
        if UserManager.find_user_by_username(username):
            return None
        
        # 生成用户ID
        user_id = re.sub(r'[^a-zA-Z0-9_]', '', username.lower())
        # 确保ID唯一
        base_id = user_id
        counter = 1
        while UserManager.find_user_by_id(user_id):
            user_id = f"{base_id}{counter}"
            counter += 1
        
        # 创建用户记录
        new_user = {
            "id": user_id,
            "username": username,
            "password": UserManager.hash_password(password),  # 使用哈希存储
            "role": role,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # 添加用户
        users = UserManager.load_users()
        users.append(new_user)
        
        if UserManager.save_users(users):
            # 创建用户题库目录
            user_dir = Config.get_user_dir(user_id)
            user_dir.mkdir(exist_ok=True)
            
            # 创建默认科目目录（可选）
            for subject in Config.SUPPORTED_SUBJECTS:
                subject_dir = user_dir / subject
                subject_dir.mkdir(exist_ok=True)
                
                # 创建题型目录
                for qtype in Config.QUESTION_TYPES:
                    (subject_dir / qtype).mkdir(exist_ok=True)
            
            return new_user
        return None
    
    @staticmethod
    def delete_user(user_id: str, delete_files: bool = True) -> bool:
        """删除用户"""
        users = UserManager.load_users()
        user_to_delete = None
        
        # 找到要删除的用户
        for user in users:
            if user['id'] == user_id:
                user_to_delete = user
                break
        
        if not user_to_delete:
            return False
        
        # 不能删除admin用户
        if user_to_delete['role'] == 'admin' and user_id == 'admin':
            print("不能删除管理员用户")
            return False
        
        # 从列表中移除
        users = [u for u in users if u['id'] != user_id]
        
        if UserManager.save_users(users):
            if delete_files:
                # 删除用户题库目录
                user_dir = Config.get_user_dir(user_id)
                if user_dir.exists():
                    shutil.rmtree(user_dir)
                    print(f"已删除用户题库目录: {user_dir}")
                
                # 删除用户模板文件
                for template_file in Config.TEMPLATE_DIR.glob(f"{user_id}_*.json"):
                    template_file.unlink()
                    print(f"已删除模板文件: {template_file}")
                
                # 删除用户输出目录
                for output_dir in Config.OUTPUT_DIR.glob(f"{user_id}_*"):
                    if output_dir.is_dir():
                        shutil.rmtree(output_dir)
                        print(f"已删除输出目录: {output_dir}")
            
            return True
        return False
    
    @staticmethod
    def reset_password(user_id: str, new_password: str) -> bool:
        """重置用户密码"""
        # 检查密码强度
        import re
        is_strong, message = UserManager.check_password_strength(new_password)
        if not is_strong:
            print(f"密码强度检查失败: {message}")
            return False
        
        users = UserManager.load_users()
        for user in users:
            if user['id'] == user_id:
                user['password'] = UserManager.hash_password(new_password)
                return UserManager.save_users(users)
        return False
    
    @staticmethod
    def update_user_role(user_id: str, new_role: str) -> bool:
        """更新用户角色"""
        if new_role not in ['admin', 'user']:
            return False
        
        users = UserManager.load_users()
        for user in users:
            if user['id'] == user_id:
                user['role'] = new_role
                return UserManager.save_users(users)
        return False
    
    @staticmethod
    def verify_login(username: str, password: str) -> Optional[Dict[str, Any]]:
        """验证登录"""
        user = UserManager.find_user_by_username(username)
        if user and user['password'] == UserManager.hash_password(password):
            return user
        return None