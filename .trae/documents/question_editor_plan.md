# 题目编辑功能实现计划

## 1. 系统架构分析

### 1.1 前端架构
- **文件结构**：`frontend/index.html` (主页面), `frontend/js/main.js` (主要逻辑), `frontend/css/style.css` (样式)
- **题目显示**：通过 `renderTopicQuestions` 方法渲染在考点展开区域
- **数学公式**：使用 KaTeX 渲染数学公式
- **数据获取**：通过 `/api/bank/questions` API 获取题目数据

### 1.2 后端架构
- **框架**：Flask
- **API实现**：`backend/app.py` 提供题目数据和其他功能的API
- **题目解析**：`backend/question_parser.py` 解析Markdown格式的题目文件
- **数据存储**：题目以Markdown格式存储在用户目录下的文件中

### 1.3 题目数据结构
- **文件格式**：Markdown文件，题目之间以 `---` 分隔
- **题目字段**：
  - `content`：题干（包含选项）
  - `options`：选项列表
  - `answer`：答案
  - `analysis`：解析
  - `difficulty`：难度
  - `score`：分值
- **数学公式**：使用 `$` 定界符包围

## 2. 功能需求分析

### 2.1 功能要求
1. **编辑按钮**：在每个题目右边增加一个"编辑"按钮
2. **编辑对话框**：点击编辑按钮弹出对话框，包含三个编辑器区域
   - 题干编辑器
   - 答案编辑器
   - 解析编辑器
3. **导出数据区域**：显示整个题目的预览，保留 $ 定界符
4. **关闭按钮**：点击后关闭对话框
5. **技术实现**：使用 tiptap 编辑器和 aarkue/tiptap-math-extension 用于数学公式编辑

### 2.2 技术依赖
- **前端**：tiptap 编辑器、aarkue/tiptap-math-extension、KaTeX
- **后端**：无需修改后端代码（本次实现不包含保存功能）

## 3. 实现步骤

### 3.1 步骤一：添加必要的依赖
- 在 `index.html` 中添加 tiptap 相关依赖
- 添加 aarkue/tiptap-math-extension 依赖
- 添加必要的 CSS 样式

### 3.2 步骤二：修改题目渲染逻辑
- 修改 `renderTopicQuestions` 方法，为每个题目添加编辑按钮
- 确保编辑按钮显示在题目右侧
- 绑定编辑按钮的点击事件到 `openEditModal` 方法

### 3.3 步骤三：创建编辑对话框
- 在 `index.html` 中添加编辑对话框的 HTML 结构
- 对话框包含三个编辑器区域和一个导出数据区域
- 对话框包含关闭按钮

### 3.4 步骤四：集成 tiptap 编辑器
- 初始化三个 tiptap 编辑器实例（题干、答案、解析）
- 配置 aarkue/tiptap-math-extension 扩展
- 实现编辑器的内容同步到导出数据区域

### 3.5 步骤五：实现导出数据功能
- 监听编辑器内容变化，实时更新导出数据区域
- 提取纯文本内容，保留 $ 定界符
- 更新导出数据区域的显示

### 3.6 步骤六：实现对话框控制
- 实现编辑按钮点击显示对话框
- 实现关闭按钮点击关闭对话框
- 实现对话框的动画效果

## 4. 具体实现细节

### 4.1 依赖添加
```html
<!-- tiptap 核心依赖 -->
<script src="https://unpkg.com/@tiptap/core@2"></script>
<script src="https://unpkg.com/@tiptap/extension-bold@2"></script>
<script src="https://unpkg.com/@tiptap/extension-italic@2"></script>
<script src="https://unpkg.com/@tiptap/extension-paragraph@2"></script>
<script src="https://unpkg.com/@tiptap/extension-text@2"></script>
<script src="https://unpkg.com/@tiptap/extension-heading@2"></script>
<script src="https://unpkg.com/@tiptap/extension-list-item@2"></script>
<script src="https://unpkg.com/@tiptap/extension-ordered-list@2"></script>
<script src="https://unpkg.com/@tiptap/extension-bullet-list@2"></script>
<script src="https://unpkg.com/@tiptap/extension-hard-break@2"></script>
<script src="https://unpkg.com/@tiptap/starter-kit@2"></script>

<!-- tiptap 数学公式扩展 -->
<script src="https://unpkg.com/@aarkue/tiptap-math-extension@latest"></script>

<!-- tiptap 样式 -->
<link rel="stylesheet" href="https://unpkg.com/@tiptap/extension-mention@2/style.css" />
<style>
  .tiptap {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    min-height: 100px;
    margin-bottom: 10px;
  }
  .tiptap:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .editor-section {
    margin-bottom: 20px;
  }
  .editor-section label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  .export-section {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
  }
  .export-data {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    min-height: 100px;
    background-color: #f9fafb;
    font-family: monospace;
    white-space: pre-wrap;
  }
  .question-item {
    position: relative;
    padding-right: 80px;
  }
  .edit-button {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  }
  .edit-button:hover {
    background-color: #2563eb;
  }
</style>
```

### 4.2 编辑对话框 HTML 结构
```html
<div id="question-edit-modal" class="modal">
  <div class="modal-content modal-lg" style="max-width: 900px;">
    <div class="modal-header">
      <h3>编辑题目</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <!-- 题干编辑器 -->
      <div class="editor-section">
        <label>题干</label>
        <div id="question-stem-editor" class="tiptap"></div>
      </div>
      
      <!-- 答案编辑器 -->
      <div class="editor-section">
        <label>答案</label>
        <div id="question-answer-editor" class="tiptap"></div>
      </div>
      
      <!-- 解析编辑器 -->
      <div class="editor-section">
        <label>解析</label>
        <div id="question-analysis-editor" class="tiptap"></div>
      </div>
      
      <!-- 导出数据区域 -->
      <div class="export-section">
        <label>导出数据（纯文本，保留 $ 定界符）</label>
        <div id="export-data" class="export-data"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button id="edit-modal-close" class="btn btn-primary">关闭</button>
    </div>
  </div>
</div>
```

### 4.3 题目渲染修改
- 在 `renderTopicQuestions` 方法中，为每个题目添加编辑按钮
- 按钮位置在题目右侧
- 绑定点击事件到 `openEditModal` 方法

```javascript
// 修改 renderTopicQuestions 方法中的题目渲染
questions.forEach((question, index) => {
    let questionContent = this.extractQuestionContent(question.content);
    
    // 先只渲染题干（不包含选项）
    html += `<div class="question-item" data-qidx="${index}">
        <span class="question-number">${index + 1}.</span>
        <div class="question-content">${this.escapeHtml(questionContent)}</div>
        <button class="edit-button" data-question-index="${index}">编辑</button>
    </div>`;
});
```

### 4.4 编辑器初始化
- 在 `PaperComposer` 类中添加编辑器初始化方法
- 为每个编辑器配置必要的扩展
- 实现内容同步到导出数据区域

```javascript
// 初始化编辑器
initEditors() {
    // 题干编辑器
    this.stemEditor = new Editor({
        element: document.getElementById('question-stem-editor'),
        extensions: [
            StarterKit,
            MathExtension.configure({
                katexOptions: {
                    throwOnError: false
                }
            })
        ],
        content: '',
        onUpdate: () => this.updateExportData()
    });
    
    // 答案编辑器
    this.answerEditor = new Editor({
        element: document.getElementById('question-answer-editor'),
        extensions: [
            StarterKit,
            MathExtension.configure({
                katexOptions: {
                    throwOnError: false
                }
            })
        ],
        content: '',
        onUpdate: () => this.updateExportData()
    });
    
    // 解析编辑器
    this.analysisEditor = new Editor({
        element: document.getElementById('question-analysis-editor'),
        extensions: [
            StarterKit,
            MathExtension.configure({
                katexOptions: {
                    throwOnError: false
                }
            })
        ],
        content: '',
        onUpdate: () => this.updateExportData()
    });
}
```

### 4.5 导出数据功能
- 监听编辑器内容变化
- 提取纯文本内容，保留 $ 定界符
- 更新导出数据区域的显示

```javascript
// 更新导出数据
updateExportData() {
    const stemContent = this.stemEditor.getHTML();
    const answerContent = this.answerEditor.getHTML();
    const analysisContent = this.analysisEditor.getHTML();
    
    // 转换为纯文本，保留 $ 定界符
    const stemText = this.htmlToPlainText(stemContent);
    const answerText = this.htmlToPlainText(answerContent);
    const analysisText = this.htmlToPlainText(analysisContent);
    
    // 构建完整的题目文本
    let exportText = stemText;
    if (answerText) {
        exportText += '\n答案：' + answerText;
    }
    if (analysisText) {
        exportText += '\n解析：' + analysisText;
    }
    
    // 更新导出数据区域
    document.getElementById('export-data').textContent = exportText;
}

// HTML转纯文本，保留 $ 定界符
htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}
```

### 4.6 对话框控制
- 实现编辑按钮点击显示对话框
- 实现关闭按钮点击关闭对话框
- 实现对话框的动画效果

```javascript
// 打开编辑对话框
openEditModal(questionIndex, question) {
    // 填充编辑器内容
    this.stemEditor.commands.setContent(this.escapeHtml(question.content));
    this.answerEditor.commands.setContent(this.escapeHtml(question.answer));
    this.analysisEditor.commands.setContent(this.escapeHtml(question.analysis));
    
    // 显示对话框
    const modal = document.getElementById('question-edit-modal');
    modal.style.display = 'block';
    
    // 更新导出数据
    this.updateExportData();
}

// 关闭编辑对话框
closeEditModal() {
    const modal = document.getElementById('question-edit-modal');
    modal.style.display = 'none';
}
```

## 5. 风险评估

### 5.1 潜在风险
1. **依赖加载问题**：tiptap 和数学公式扩展可能加载失败
2. **编辑器性能**：多个编辑器同时运行可能影响性能
3. **数学公式渲染**：确保 $ 定界符正确处理
4. **兼容性问题**：不同浏览器对 tiptap 的支持程度不同
5. **数据同步**：编辑器内容与导出数据的同步可能出现延迟

### 5.2 风险缓解措施
1. **依赖加载**：添加依赖加载失败的降级处理，使用本地备份
2. **性能优化**：实现编辑器的懒加载和销毁逻辑
3. **公式处理**：测试各种数学公式输入格式，确保正确渲染
4. **兼容性**：针对主流浏览器进行测试，添加浏览器检测
5. **数据同步**：使用防抖机制减少频繁更新，确保数据一致性

## 6. 后续扩展

### 6.1 待实现功能
1. **保存功能**：修改后题目或新建题目的保存功能
2. **题目类型支持**：针对不同题型的编辑器定制
3. **批量编辑**：支持批量编辑多个题目
4. **版本控制**：保存题目编辑历史

### 6.2 技术扩展
1. **图片上传**：支持在编辑器中插入图片
2. **公式库**：提供常用数学公式模板
3. **题目预览**：实时预览题目渲染效果
4. **协作编辑**：支持多人同时编辑题目

### 6.3 后端API扩展
1. **题目保存API**：添加保存修改后题目的API
2. **题目创建API**：支持创建新题目
3. **题目删除API**：支持删除题目
4. **题目版本API**：管理题目编辑历史

## 7. 测试计划

### 7.1 功能测试
- **编辑按钮**：显示位置正确，点击响应正常
- **对话框**：打开/关闭功能正常，布局合理
- **编辑器**：基本编辑功能正常，数学公式编辑和渲染正确
- **导出数据**：内容更新及时，格式正确，保留 $ 定界符
- **不同题型**：支持编辑不同类型的题目（选择题、判断题、填空题等）

### 7.2 兼容性测试
- **主流浏览器**：Chrome、Firefox、Safari、Edge
- **屏幕尺寸**：桌面端、平板、手机
- **设备类型**：Windows、macOS、Linux

### 7.3 性能测试
- **编辑器初始化**：加载速度快，无明显延迟
- **数学公式**：渲染性能良好，无卡顿
- **多题目编辑**：同时编辑多个题目时性能稳定

## 8. 实现时间估计

| 步骤 | 预计时间 |
|------|----------|
| 依赖添加和配置 | 30分钟 |
| 编辑按钮添加 | 20分钟 |
| 编辑对话框创建 | 40分钟 |
| tiptap 编辑器集成 | 60分钟 |
| 导出数据功能 | 30分钟 |
| 对话框控制 | 20分钟 |
| 测试和调试 | 40分钟 |
| **总计** | **240分钟** |

## 9. 结论

本计划详细说明了如何实现题目编辑功能，包括添加编辑按钮、创建编辑对话框、集成 tiptap 编辑器等。通过分步骤实现，可以确保功能的完整性和可靠性。同时，计划也考虑了潜在的风险和后续的扩展可能性，为系统的持续迭代做好了准备。

本次实现仅包含前端编辑功能，不涉及后端保存功能，后续可以根据需求扩展保存功能和其他高级特性。