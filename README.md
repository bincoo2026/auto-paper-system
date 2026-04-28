# 自动组卷系统

一个基于 Flask 的自动组卷系统，支持题库管理、试卷模板定制、智能组卷和 Word 格式导出。

## 功能特性

- **题库管理**：支持多种题型（选择题、判断题、计算题、填空题、解答题、应用题、证明题）
- **多级分类**：科目 → 题型 → 章节 → 考点的四级目录结构
- **试卷模板**：支持自定义试卷模板，灵活配置各题型数量和分值
- **智能组卷**：支持单套和多套试卷批量生成
- **Word 导出**：自动将试卷转换为 Word 格式，支持批量下载
- **LaTeX 支持**：完美渲染数学公式
- **多用户支持**：支持管理员和普通用户角色

## 技术栈

- **后端**：Python 3.7+ + Flask + Flask-CORS
- **前端**：HTML5 + CSS3 + JavaScript + KaTeX
- **数据库**：JSON 文件存储（轻量级配置）

## 快速开始

### 环境要求

- Python 3.7 或更高版本
- pip 包管理工具

### 安装运行

```bash
# 克隆项目
git clone https://github.com/your-repo/auto-paper-system.git
cd auto-paper-system

# 运行启动脚本
python run.py
```

启动脚本会自动检查并安装依赖，然后启动服务。

### 访问系统

打开浏览器访问：http://localhost:5000

### 默认账号

| 用户名 | 密码 | 角色 |
| :--- | :--- | :--- |
| admin | admin123 | 管理员 |
| user | user123 | 普通用户 |

## 项目结构

```
auto-paper-system/
├── backend/                    # 后端代码
│   ├── app.py                  # Flask 应用入口
│   ├── config.py               # 配置管理
│   ├── user_manager.py         # 用户管理
│   ├── question_parser.py      # 题目解析器
│   ├── paper_generator.py      # 试卷生成器
│   ├── question_bank/          # 题库目录
│   ├── templates/              # 试卷模板目录
│   └── requirements.txt        # 依赖列表
├── frontend/                   # 前端代码
│   ├── index.html              # 主界面
│   ├── login.html              # 登录页面
│   ├── css/                    # 样式文件
│   └── js/                     # JavaScript 文件
├── run.py                      # 启动脚本
└── README.md                   # 项目说明
```

## 使用说明

### 1. 登录系统

访问 http://localhost:5000，使用默认账号登录。

### 2. 管理题库

在左侧导航栏中选择科目和题型，点击章节和考点查看题目。支持新增、编辑、删除题目。

### 3. 生成试卷

选择"组卷"功能，配置试卷参数：
- 设置试卷标题和科目
- 选择题型，设置每题分值和题目数量
- 点击"生成试卷"或"生成多套试卷"

### 4. 下载试卷

生成试卷后，可以：
- 在线预览试卷内容
- 下载单套试卷的 Word 文档
- 批量下载多套试卷的压缩包

## 题目格式规范

题目文件采用 Markdown 格式，每个题目之间用 `---` 分隔：

```markdown
# 考点名称

---

题目内容  
选项A 选项B 选项C 选项D  
答案：A  
解析：...

---

第二题内容  
答案：正确  
难度：容易
```

## 配置说明

### 修改端口

编辑 `backend/config.py` 文件：

```python
PORT = 5000  # 修改为其他端口
```

## 开发说明

### 安装依赖

```bash
pip install -r backend/requirements.txt
```

### 开发模式

```bash
python run.py
```

### 生产部署

```bash
# 使用 gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
```

## 贡献

欢迎提交 Issue 和 Pull Request！
