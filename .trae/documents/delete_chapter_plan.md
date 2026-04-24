# 删除章文件夹功能实现计划

## 1. 项目结构分析

### 前端文件
- **frontend/index.html**: 主页面，包含UI结构
- **frontend/js/main.js**: 前端核心逻辑，包含题库渲染和操作功能

### 后端文件
- **backend/app.py**: 后端API实现，包含各种题库操作的端点

### 现有相关功能
- **删除考点**: `/api/bank/delete-topic` 端点
- **删除题目**: `/api/bank/delete-question` 端点
- **重命名章目录**: `/api/bank/rename-chapter` 端点

## 2. 实现计划

### 2.1 后端API实现

**新增端点**: `/api/bank/delete-chapter`

**功能**: 删除指定科目、题型下的章文件夹

**参数**: 
- `subject`: 科目名称
- `questionType`: 题型名称
- `chapterName`: 章文件夹名称

**实现步骤**:
1. 验证请求参数是否完整
2. 获取用户目录
3. 构建章文件夹路径
4. 验证章文件夹是否存在
5. 删除章文件夹及其所有内容
6. 清除缓存
7. 返回成功响应

### 2.2 前端实现

**1. 添加删除按钮**
- 在 `renderCurrentTypeChapters` 方法中，为每个章文件夹添加删除按钮
- 位置：重命名图标按钮之后，新增考点图标按钮之前
- 样式：使用 Font Awesome 的 trash-alt 图标

**2. 实现删除确认对话框**
- 参考现有的删除考点对话框 (`delete-topic-modal`)
- 新增删除章文件夹对话框 (`delete-chapter-modal`)
- 包含确认和取消按钮

**3. 实现删除逻辑**
- 添加 `openDeleteChapterModal` 方法：打开删除确认对话框
- 添加 `closeDeleteChapterModal` 方法：关闭删除确认对话框
- 添加 `saveDeleteChapter` 方法：发送删除请求到后端

**4. 刷新显示**
- 删除成功后，调用 `loadBankStructure` 重新加载题库结构
- 确保页面刷新后能看到章文件夹已被删除

## 3. 代码修改点

### 3.1 后端修改
- **backend/app.py**: 新增 `/api/bank/delete-chapter` 端点

### 3.2 前端修改
- **frontend/index.html**: 添加删除章文件夹的模态框
- **frontend/js/main.js**:
  - 在 `renderCurrentTypeChapters` 方法中添加删除按钮
  - 添加 `openDeleteChapterModal` 方法
  - 添加 `closeDeleteChapterModal` 方法
  - 添加 `saveDeleteChapter` 方法

## 4. 技术实现细节

### 4.1 后端API实现
```python
@app.route('/api/bank/delete-chapter', methods=['POST'])
@login_required
def delete_chapter():
    """删除章目录"""
    try:
        data = request.get_json()
        subject = data.get('subject')
        questionType = data.get('questionType')
        chapterName = data.get('chapterName')
        
        if not subject or not questionType or not chapterName:
            return jsonify({'success': False, 'message': '科目、题型和章目录名称不能为空'}), 400
        
        # 获取用户目录
        user_id = session.get('user_id')
        user_dir = Config.get_user_dir(user_id)
        
        # 构建章目录路径
        chapter_path = user_dir / subject / questionType / chapterName
        
        if not chapter_path.exists():
            return jsonify({'success': False, 'message': '章目录不存在'}), 404
        
        # 删除章目录及其所有内容
        try:
            import shutil
            shutil.rmtree(chapter_path)
            print(f"删除章目录: {chapter_path}")
            # 清除缓存
            from question_parser import QuestionParser
            QuestionParser.clear_cache()
            return jsonify({'success': True, 'message': '章目录删除成功'})
        except Exception as e:
            print(f"删除章目录失败: {e}")
            return jsonify({'success': False, 'message': '删除章目录失败: {}'.format(str(e))}), 500
    except Exception as e:
        print(f"删除章目录失败: {e}")
        return jsonify({'success': False, 'message': '删除章目录失败: {}'.format(str(e))}), 500
```

### 4.2 前端实现

**1. 添加删除按钮到章文件夹**
```javascript
// 在 renderCurrentTypeChapters 方法中
html += `<div class="chapter-section">
    <h4>
        <i class="fas fa-folder-open"></i> ${chapter.name}
        <span class="chapter-count">${chapter.topics.length}个考点</span>
        <span class="rename-chapter-badge" title="重命名章目录" onclick="event.stopPropagation(); paperComposer.openRenameChapterModal('${this.currentSubject}', '${this.currentQuestionType}', '${chapter.name}')">
            <i class="fas fa-edit"></i>
        </span>
        <span class="delete-chapter-badge" title="删除章目录" onclick="event.stopPropagation(); paperComposer.openDeleteChapterModal('${this.currentSubject}', '${this.currentQuestionType}', '${chapter.name}')">
            <i class="fas fa-trash-alt"></i>
        </span>
        <button class="add-topic-button" onclick="event.stopPropagation(); paperComposer.openAddTopicModal('${this.currentSubject}/${this.currentQuestionType}/${chapter.name}')" title="新增考点">
            <i class="fas fa-plus-circle"></i>
        </button>
    </h4>
    <!-- 其他内容 -->
</div>`;
```

**2. 添加删除章文件夹模态框**
```html
<!-- 在 index.html 中添加 -->
<div id="delete-chapter-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <h3>确认删除</h3>
        <p>确定要删除该章目录吗？此操作将删除该章目录下的所有考点和题目，且无法恢复。</p>
        <div class="modal-actions">
            <button id="delete-chapter-cancel" class="btn btn-secondary">取消</button>
            <button id="delete-chapter-confirm" class="btn btn-danger">确认删除</button>
        </div>
    </div>
</div>
```

**3. 实现删除相关方法**
```javascript
// 打开删除章目录对话框
openDeleteChapterModal(subject, questionType, chapterName) {
    console.log('打开删除章目录对话框', subject, questionType, chapterName);
    
    // 保存当前章目录信息
    this.currentChapterInfo = {
        subject: subject,
        questionType: questionType,
        chapterName: chapterName
    };
    
    // 显示对话框
    const modal = document.getElementById('delete-chapter-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // 为取消按钮添加点击事件监听器
    const cancelButton = document.getElementById('delete-chapter-cancel');
    const self = this; // 保存 this 引用
    if (cancelButton) {
        cancelButton.onclick = () => self.closeDeleteChapterModal();
    }
    
    // 为确认按钮添加点击事件监听器
    const confirmButton = document.getElementById('delete-chapter-confirm');
    if (confirmButton) {
        confirmButton.onclick = () => self.saveDeleteChapter();
    }
}

// 关闭删除章目录对话框
closeDeleteChapterModal() {
    const modal = document.getElementById('delete-chapter-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    this.currentChapterInfo = null;
}

// 保存删除章目录
async saveDeleteChapter() {
    const self = this;
    try {
        if (!this.currentChapterInfo) {
            this.showMessage('未找到章目录信息', 'error');
            return;
        }

        const { subject, questionType, chapterName } = this.currentChapterInfo;

        // 发送请求到后端
        const response = await fetch('/api/bank/delete-chapter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: subject,
                questionType: questionType,
                chapterName: chapterName
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || '删除章目录失败');
        }

        const result = await response.json();
        if (result.success) {
            // 关闭对话框
            this.closeDeleteChapterModal();
            // 重新加载题库结构
            await this.loadBankStructure(this.currentSubject);
            // 显示成功消息
            this.showMessage('章目录删除成功', 'success');
        } else {
            throw new Error(result.message || '删除章目录失败');
        }
    } catch (error) {
        console.error('删除章目录失败:', error);
        this.showMessage('删除章目录失败: ' + error.message, 'error');
    }
}
```

## 5. 风险评估

### 5.1 潜在风险
1. **数据丢失风险**: 删除章文件夹会删除其中的所有考点和题目，需要确保用户确认
2. **权限风险**: 确保只有登录用户可以删除自己的章文件夹
3. **路径遍历风险**: 需要确保用户不能通过构造路径删除其他用户的文件
4. **缓存清理**: 删除后需要确保缓存被正确清理，避免显示过时数据

### 5.2 风险缓解措施
1. **确认对话框**: 添加详细的确认信息，明确告知用户删除的后果
2. **权限验证**: 使用现有的 `@login_required` 装饰器确保只有登录用户可以访问
3. **路径安全**: 使用 `Config.get_user_dir` 确保操作限制在用户自己的目录内
4. **缓存清理**: 在删除后调用 `QuestionParser.clear_cache()` 清理缓存

## 6. 测试计划

### 6.1 功能测试
1. **删除空章文件夹**: 测试删除没有考点的章文件夹
2. **删除非空章文件夹**: 测试删除包含考点和题目的章文件夹
3. **删除不存在的章文件夹**: 测试删除不存在的章文件夹时的错误处理
4. **权限测试**: 测试未登录用户是否无法删除章文件夹

### 6.2 界面测试
1. **按钮显示**: 确认删除按钮在正确的位置显示
2. **对话框**: 测试删除确认对话框的显示和功能
3. **刷新显示**: 测试删除后页面是否正确刷新，章文件夹是否消失

## 7. 实现注意事项

1. **保持代码风格一致**: 遵循现有代码的风格和命名规范
2. **错误处理**: 确保所有错误都有适当的处理和提示
3. **用户体验**: 确保删除操作有明确的反馈和确认机制
4. **性能优化**: 确保删除操作不会影响系统性能
5. **安全性**: 确保删除操作不会导致安全问题

## 8. 总结

本计划实现了删除章文件夹的功能，包括后端API和前端界面。通过参考现有的删除考点和重命名章目录功能，确保了实现的一致性和可靠性。同时，通过详细的风险评估和测试计划，确保了功能的安全性和稳定性。