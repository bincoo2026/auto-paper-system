#!/usr/bin/env python3
"""
将单用户系统迁移到多用户系统
将现有题库和模板迁移到admin用户
"""
import sys
import os
from pathlib import Path
import shutil
import json
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import Config

def migrate():
    """执行迁移"""
    print("="*50)
    print("开始迁移到多用户系统")
    print("="*50)
    
    # 检查现有题库
    if not Config.BANK_ROOT.exists():
        print("题库目录不存在，无需迁移")
        return
    
    # 检查是否已经是多用户结构
    has_user_dirs = False
    for item in Config.BANK_ROOT.iterdir():
        if item.is_dir() and item.name not in Config.SUPPORTED_SUBJECTS:
            has_user_dirs = True
            break
    
    if has_user_dirs:
        print("检测到已经是多用户结构，跳过迁移")
        return
    
    # 创建admin用户目录
    admin_dir = Config.BANK_ROOT / 'admin'
    admin_dir.mkdir(exist_ok=True)
    
    # 移动现有科目到admin目录
    moved_count = 0
    for subject in Config.SUPPORTED_SUBJECTS:
        subject_path = Config.BANK_ROOT / subject
        if subject_path.exists() and subject_path.is_dir():
            dest_path = admin_dir / subject
            if not dest_path.exists():
                shutil.move(str(subject_path), str(dest_path))
                print(f"移动科目: {subject} -> admin/{subject}")
                moved_count += 1
    
    print(f"已移动 {moved_count} 个科目到admin用户")
    
    # 迁移模板文件
    template_moved = 0
    for template_file in Config.TEMPLATE_DIR.glob("*.json"):
        if not template_file.name.startswith("admin_"):
            new_name = f"admin_{template_file.name}"
            template_file.rename(Config.TEMPLATE_DIR / new_name)
            print(f"重命名模板: {template_file.name} -> {new_name}")
            template_moved += 1
    
    print(f"已迁移 {template_moved} 个模板文件")
    
    # 创建users.json
    users_file = Config.USERS_FILE
    if not users_file.exists():
        users_data = {
            "users": [
                {
                    "id": "admin",
                    "username": "admin",
                    "password": "admin123",
                    "role": "admin",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            ]
        }
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump(users_data, f, indent=2, ensure_ascii=False)
        print("已创建用户文件 users.json")
    
    print("\n迁移完成！")
    print("管理员用户名: admin")
    print("管理员密码: admin123")
    print("="*50)

if __name__ == "__main__":
    migrate()