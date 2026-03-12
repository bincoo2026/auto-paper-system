import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent

class Config:
    # Flask配置
    SECRET_KEY = 'auto-paper-system-secret-key-2024'
    DEBUG = True
    
    # 登录配置
    LOGIN_USERNAME = 'math'  # 登录用户名
    LOGIN_PASSWORD = '307'  # 登录密码

    # 系统路径配置
    BANK_ROOT = BASE_DIR / 'question_bank'  # 题库根目录
    TEMPLATE_DIR = BASE_DIR / 'templates'   # 模板目录
    OUTPUT_DIR = BASE_DIR / 'output'        # 输出目录
    USERS_FILE = BASE_DIR / 'users.json'    # 用户数据文件
    REFERENCE_DOCX = BASE_DIR / 'reference.docx'  # Word参考文档，用于定制样式
    
    # 支持的科目
    SUPPORTED_SUBJECTS = ['我的课程']
    
    # 支持的题型
    QUESTION_TYPES = ['选择题', '判断题', '填空题', '计算题', '解答题', '应用题', '证明题']
    
    @classmethod
    def init_dirs(cls):
        """初始化必要的目录"""
        for directory in [cls.BANK_ROOT, cls.TEMPLATE_DIR, cls.OUTPUT_DIR]:
            directory.mkdir(exist_ok=True)
        
        # 初始化用户文件
        if not cls.USERS_FILE.exists():
            # 创建默认管理员用户
            default_users = {
                "users": [
                    {
                        "id": "admin",
                        "username": "admin",
                        "password": "admin123",  # 实际应用中应使用哈希
                        "role": "admin",
                        "created_at": "2024-01-01"
                    }
                ]
            }
            with open(cls.USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_users, f, indent=2, ensure_ascii=False)
    
    @classmethod
    def get_user_dir(cls, user_id):
        """获取用户专属的题库目录"""
        return cls.BANK_ROOT / user_id
    
    @classmethod
    def get_user_template_path(cls, user_id, template_name):
        """获取用户专属的模板文件路径"""
        # 清理模板名称中的无效字符
        import re
        safe_name = re.sub(r'[<>:"/\\|?*]', '', template_name)
        return cls.TEMPLATE_DIR / f"{user_id}_{safe_name}.json"
    
    @classmethod
    def get_user_output_dir(cls, user_id, folder_name):
        """获取用户专属的输出目录"""
        return cls.OUTPUT_DIR / f"{user_id}_{folder_name}"