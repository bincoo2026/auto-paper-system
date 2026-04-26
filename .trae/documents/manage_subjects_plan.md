# 新增/管理科目功能实现计划

## 1. 项目结构分析

### 前端文件
- **frontend/index.html**: 主页面，包含科目选择下拉框和模板管理按钮
- **frontend/js/main.js**: 前端核心逻辑，包含科目加载和模板管理功能
- **frontend/css/style.css**: 样式文件

### 后端文件
- **backend/app.py**: 后端API实现
- **backend/config.py**: 配置文件，包含题库目录结构

### 现有相关功能
- **科目获取**: `GET /api/subjects` - 获取科目列表
- **模板管理**: 有完整的"管理模板"按钮和对话框实现，可作为参考
- **章节管理**: 有重命名和删除功能，可作为参考

### 目录结构
- 题库根目录: `BANK_ROOT / user_id /`
- 每个科目是一个目录，包含各题型子目录

## 2. 实现计划

### 2.1 后端API实现

**新增端点**:

1. **POST /api/bank/add-subject** - 新增科目
   - 参数: `subject` (科目名称)
   - 功能: 在用户题库目录下创建新的科目文件夹
   - 返回: success/error

2. **POST /api/bank/delete-subject** - 删除科目
   - 参数: `subject` (科目名称)
   - 功能: 删除用户题库目录下的科目文件夹及其所有内容
   - 返回: success/error

3. **POST /api/bank/rename-subject** - 重命名科目
   - 参数: `old_name` (旧名称), `new_name` (新名称)
   - 功能: 重命名用户题库目录下的科目文件夹
   - 返回: success/error

### 2.2 前端实现

**1. 添加"新增/管理科目"按钮**
- 位置: 科目选择下拉框右侧，参考"管理模板"按钮位置
- 样式: 与"管理模板"按钮样式一致
- 按钮结构:
```html
<div class="subject-header">
    <label for="subject-select"><i class="fas fa-book"></i> 选择课程或科目</label>
    <button id="manage-subjects-btn" class="btn btn-small btn-secondary subject-manage-btn" title="新增/管理科目">
        <i class="fas fa-cog"></i> 新增/管理科目
    </button>
</div>
<select id="subject-select" class="form-control">
    <option value="">-- 请选择课程或科目 --</option>
</select>
```

**2. 添加科目管理对话框**
- 位置: 在 template-manage-modal 附近
- 结构: 参考模板管理对话框
- 功能:
  - 显示科目列表
  - 每个科目显示重命名和删除按钮
  - 底部有新增科目输入框和添加按钮

**3. 添加科目管理对话框的HTML结构**
```html
<div id="subject-manage-modal" class="modal">
    <div class="modal-content modal-lg" style="max-width: 600px;">
        <div class="modal-header">
            <h3>新增/管理科目</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="subject-list-container">
                <table class="subject-table">
                    <thead>
                        <tr>
                            <th style="width: 60%;">科目名称</th>
                            <th style="width: 40%;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="subject-list"></tbody>
                </table>
                <div id="subject-empty-state" class="empty-state" style="display: none;">
                    <i class="fas fa-folder-open"></i>
                    <p>暂无科目</p>
                    <p class="empty-hint">在下方输入科目名称创建新科目</p>
                </div>
            </div>
            <div class="add-subject-form">
                <input type="text" id="new-subject-name" class="form-control" placeholder="输入新科目名称">
                <button id="add-subject-btn" class="btn btn-primary">新增科目</button>
            </div>
        </div>
        <div class="modal-footer">
            <button id="subject-manage-close" class="btn btn-primary">关闭</button>
        </div>
    </div>
</div>
```

**4. 实现JavaScript方法**

```javascript
// 打开科目管理对话框
async showSubjectManageModal() {
    // 显示对话框
    // 加载科目列表
    // 绑定新增科目按钮事件
    // 绑定删除科目按钮事件
    // 绑定重命名科目按钮事件
}

// 新增科目
async addSubject() {
    // 获取输入的科目名称
    // 调用后端API添加科目
    // 成功后刷新科目列表和下拉框
}

// 删除科目
async deleteSubject(subjectName) {
    // 调用后端API删除科目
    // 成功后刷新科目列表和下拉框
}

// 重命名科目
async renameSubject(oldName, newName) {
    // 调用后端API重命名科目
    // 成功后刷新科目列表和下拉框
}

// 确认删除科目对话框
confirmDeleteSubject(subjectName) {
    // 弹出确认对话框
    // 调用deleteSubject确认删除
}

// 打开重命名科目对话框
openRenameSubjectModal(oldName) {
    // 显示重命名对话框
    // 填充原名称
    // 绑定确认取消事件
}
```

### 2.3 样式文件修改

**新增样式** (参考模板管理按钮样式):
```css
.subject-manage-btn {
    padding: 6px 12px;
    font-size: 0.85rem;
    background: linear-gradient(135deg, #64748b, #475569);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.subject-manage-btn:hover {
    background: linear-gradient(135deg, #475569, #334155);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.subject-manage-btn i {
    margin-right: 5px;
}

#subject-manage-modal .modal-content {
    max-width: 600px;
}

.subject-table {
    width: 100%;
    border-collapse: collapse;
}

.subject-table th,
.subject-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
}

.subject-table th {
    background: #f8fafc;
    font-weight: 600;
}

.add-subject-form {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
}

.add-subject-form input {
    flex: 1;
}

.btn-delete-subject {
    padding: 4px 10px;
    font-size: 0.85rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn-rename-subject {
    padding: 4px 10px;
    font-size: 0.85rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
```

## 3. 代码修改点

### 3.1 后端修改 (backend/app.py)
- 新增 `POST /api/bank/add-subject` 端点
- 新增 `POST /api/bank/delete-subject` 端点
- 新增 `POST /api/bank/rename-subject` 端点

### 3.2 前端修改
- **frontend/index.html**:
  - 修改科目选择区域，添加标题行和"新增/管理科目"按钮
  - 添加科目管理对话框HTML结构
- **frontend/js/main.js**:
  - 添加 `showSubjectManageModal` 方法
  - 添加 `addSubject` 方法
  - 添加 `deleteSubject` 方法
  - 添加 `renameSubject` 方法
  - 添加 `confirmDeleteSubject` 方法
  - 添加 `openRenameSubjectModal` 方法
  - 修改 `loadSubjects` 方法，在选择科目后显示管理按钮
  - 绑定按钮点击事件
- **frontend/css/style.css**:
  - 添加 `.subject-manage-btn` 样式
  - 添加 `#subject-manage-modal` 相关样式
  - 添加 `.subject-table` 样式
  - 添加 `.add-subject-form` 样式
  - 添加 `.btn-delete-subject` 和 `.btn-rename-subject` 样式

## 4. 实现注意事项

1. **安全考虑**:
   - 所有API都需要登录验证 (`@login_required`)
   - 操作限制在当前用户目录下，防止跨用户操作

2. **用户体验**:
   - 删除科目时需要二次确认
   - 操作完成后刷新科目列表
   - 错误处理要有友好的提示

3. **数据一致性**:
   - 删除科目会删除该科目下的所有题型和考点，需要谨慎处理
   - 重命名科目后需要更新相关的缓存

4. **代码风格**:
   - 遵循现有代码的风格和命名规范
   - 参考模板管理的实现方式

## 5. 总结

本计划实现了完整的科目新增/管理功能，包括：
- 后端API: 新增、删除、重命名科目
- 前端UI: 科目管理按钮和对话框
- 样式设计: 与现有界面风格一致
- 参考了模板管理的实现方式，确保代码风格一致