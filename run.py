#!/usr/bin/env python3
"""
自动组卷系统启动脚本
"""
import os
import sys
import json
from pathlib import Path

# 先检查依赖，再添加backend目录到Python路径
backend_dir = Path(__file__).parent / 'backend'

def check_dependencies():
    """检查依赖"""
    try:
        import flask
        print("✓ Flask 已安装")
        return True
    except ImportError:
        print("✗ Flask 未安装，正在安装...")
        try:
            os.system(f"{sys.executable} -m pip install -r {backend_dir}/requirements.txt")
            print("✓ 依赖安装完成")
            return True
        except:
            print("✗ 依赖安装失败，请手动安装：")
            print(f"  {sys.executable} -m pip install -r {backend_dir}/requirements.txt")
            return False

def create_sample_structure():
    """创建示例目录结构"""
    # 添加backend目录到Python路径
    sys.path.insert(0, str(backend_dir))
    from backend.config import Config
    
    print("正在初始化目录结构...")
    
    # 确保目录存在
    Config.init_dirs()
        
    print("✓ 目录结构初始化完成")
   
def start_server():
    """启动Flask服务器"""
    try:
        from backend.app import app
        print("\n" + "="*50)
        print("自动组卷系统启动成功!")
        print("="*50)
        print("\n访问地址: http://localhost:5000")
        print("按 Ctrl+C 停止服务\n")
        print("-"*50)
        
        app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
    except Exception as e:
        print(f"\n✗ 启动失败: {e}")
        print("请检查：")
        print("1. 是否已安装所有依赖")
        print("2. 端口5000是否被占用")
        print("3. Python版本是否为3.7+")
        return False

def main():
    """主函数"""
    print("="*50)
    print("自动组卷系统初始化")
    print("="*50)
    
    # 检查依赖
    if not check_dependencies():
        return
    
    # 创建目录结构
    create_sample_structure()
    
    # 启动服务器
    start_server()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n服务已停止")
    except Exception as e:
        print(f"\n✗ 系统错误: {e}")
        input("按Enter键退出...")
        sys.exit(1)