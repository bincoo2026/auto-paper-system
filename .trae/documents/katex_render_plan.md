# KaTeX 渲染替换计划

## 1. 项目现状分析

### 1.1 现有渲染方式
- **使用库**：texme (v1.2.2)
- **配置方式**：在 `frontend/index.html` 中全局配置
  ```html
  <script>window.texme = { style: 'plain', renderOnLoad: false }</script>
  <script src="https://cdn.jsdelivr.net/npm/texme@1.2.2"></script>
  ```
- **渲染逻辑**：在 `frontend/js/main.js` 的 `renderTopicQuestions` 方法中使用
  ```javascript
  // 使用texme渲染每个题目
  questions.forEach((question, index) => {
      const questionContent = this.extractQuestionContent(question.content);
      const questionElement = document.getElementById(`question-${index}`);
      
      if (questionElement && window.texme) {
          // 使用texme.render方法渲染内容
          const renderedContent = window.texme.render(questionContent);
          questionElement.innerHTML = renderedContent;
      }
  });
  ```
- **问题**：多次展开或收起考点题目列表时，渲染内容丢失

### 1.2 项目结构
- **前端**：HTML5 + CSS3 + JavaScript
- **后端**：Python + Flask
- **题目存储**：Markdown文件格式，包含LaTeX数学公式

## 2. KaTeX 渲染方案

### 2.1 KaTeX 简介
- **KaTeX**：一个快速的数学公式渲染库，专注于速度和可靠性
- **优势**：
  - 渲染速度快，适合动态内容
  - 轻量级，体积小
  - 支持大部分LaTeX语法
  - 不需要复杂的配置

### 2.2 集成方案
1. **引入KaTeX库**：在 `frontend/index.html` 中替换texme
2. **修改渲染逻辑**：在 `frontend/js/main.js` 中更新渲染方法
3. **保持现有功能**：确保题目提取、序号显示等功能不受影响

## 3. 详细替换步骤

### 3.1 步骤一：替换库引入
- **文件**：`frontend/index.html`
- **操作**：
  1. 移除texme相关的script标签
  2. 添加KaTeX的CSS和JS文件
  3. 保持其他配置不变

### 3.2 步骤二：修改渲染逻辑
- **文件**：`frontend/js/main.js`
- **操作**：
  1. 修改 `renderTopicQuestions` 方法中的渲染逻辑
  2. 使用KaTeX的API替代texme的渲染方法
  3. 保持其他逻辑不变，包括题目提取、DOM操作等

### 3.3 步骤三：测试验证
- **测试场景**：
  1. 展开/收起考点题目列表
  2. 切换不同题型
  3. 验证数学公式渲染效果
  4. 确保其他功能不受影响

## 4. 技术细节

### 4.1 KaTeX 配置
- **最小配置**：只需要引入CSS和JS文件
- **渲染方法**：使用 `katex.renderToString()` 方法将LaTeX转换为HTML
- **选项**：
  - `throwOnError: false`：遇到错误时不抛出异常
  - `displayMode: true`：支持显示模式的公式

### 4.2 代码示例
```javascript
// KaTeX渲染示例
questions.forEach((question, index) => {
    const questionContent = this.extractQuestionContent(question.content);
    const questionElement = document.getElementById(`question-${index}`);
    
    if (questionElement && window.katex) {
        // 处理题目中的数学公式
        let renderedContent = questionContent;
        
        // 渲染行内公式
        renderedContent = renderedContent.replace(/\$(.*?)\$/g, (match, formula) => {
            try {
                return window.katex.renderToString(formula, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                return match;
            }
        });
        
        // 渲染块级公式
        renderedContent = renderedContent.replace(/\\\[(.*?)\\\]/g, (match, formula) => {
            try {
                return window.katex.renderToString(formula, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                return match;
            }
        });
        
        questionElement.innerHTML = renderedContent;
    }
});
```

## 5. 风险评估

### 5.1 潜在风险
1. **LaTeX语法兼容性**：KaTeX可能不支持某些texme支持的LaTeX语法
2. **渲染效果差异**：KaTeX和texme的渲染效果可能存在细微差异
3. **性能影响**：虽然KaTeX比texme快，但频繁渲染仍可能影响性能

### 5.2 缓解措施
1. **充分测试**：测试各种类型的数学公式，确保兼容性
2. **渐进式替换**：先在测试环境中验证，再部署到生产环境
3. **性能优化**：考虑使用缓存机制，避免重复渲染相同的内容

## 6. 结论

将texme替换为KaTeX是一个合理的选择，因为：
1. KaTeX更适合动态渲染场景，解决了多次展开/收起时渲染丢失的问题
2. KaTeX渲染速度更快，提升用户体验
3. 替换过程简单，改动最小化，不会影响其他功能
4. KaTeX是一个成熟的库，被广泛使用，可靠性高

通过本计划的实施，可以有效解决当前渲染问题，同时保持系统的其他功能不变。