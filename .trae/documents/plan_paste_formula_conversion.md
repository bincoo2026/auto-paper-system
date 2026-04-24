# 计划：增加剪切板粘贴数学公式定界符转换功能

## 需求分析
在点击新建题目或编辑题目弹出编辑框后，当用户从剪切板粘贴内容时，需要对 LaTeX 公式定界符进行转换：
- `\[...\]` → `$$...$$` (块级公式)
- `\(...\)` → `$...$` (行内公式)

参考：`Tiptap-编辑框粘贴转换公式定界符.html` 中的实现

## 修改位置

### 文件：`/home/zhao/project/auto-paper-system/frontend/index.html`

**修改范围**：第806-828行的 `createEditor` 函数

## 实现步骤

### 步骤1：在 `createEditor` 函数之前添加 `convertBracketDelimiters` 转换函数

在第805行（`import { MathExtension }` 之后）和第806行（`createEditor` 函数之前）之间添加：

```javascript
// 粘贴处理：转换 \[...\] 和 \(...\) 为 $$...$$ 和 $...$
function convertBracketDelimiters(text) {
  // 先转换块级：\[...\] → $$...$$
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (match, latex) => {
    return `$$${latex.trim()}$$`;
  });
  // 再转换行内：\(...\) → $...$
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (match, latex) => {
    return `$${latex.trim()}$`;
  });
  return text;
}
```

### 步骤2：修改 `createEditor` 函数的 `Editor` 配置

在第811-827行的 `Editor` 配置对象中，添加 `editorProps` 属性：

在 `content: '',` 和 `editable: true,` 之后添加：

```javascript
editorProps: {
  transformPastedText(text) {
    return convertBracketDelimiters(text);
  },
  transformPastedHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const textContent = temp.textContent || temp.innerText || '';
    return convertBracketDelimiters(textContent);
  }
}
```

## 改动说明

1. **只改一个文件**：`index.html`
2. **只改两处**：
   - 添加 `convertBracketDelimiters` 函数（约10行）
   - 在 `Editor` 配置中添加 `editorProps`（约10行）
3. **不影响现有功能**：只添加粘贴钩子，不修改任何现有逻辑
4. **与 demo 文件保持一致**：转换逻辑完全参考 `Tiptap-编辑框粘贴转换公式定界符.html`

## 验证方法

1. 打开题目编辑框（新建或编辑）
2. 从 DeepSeek 或其他 AI 对话中复制带有 `\(...\)` 或 `\[...\]` 格式的数学公式
3. 粘贴到编辑框中
4. 确认公式被正确转换为 `$...$` 或 `$$...$$` 格式
5. 确认导出数据正确

## 相关代码阅读

- 编辑器初始化位置：[index.html:L801-828](file:///home/zhao/project/auto-paper-system/frontend/index.html#L801-828)
- 参考实现：`Tiptap-编辑框粘贴转换公式定界符.html` 第139-150行和第175-186行
