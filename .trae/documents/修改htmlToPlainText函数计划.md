# 修改htmlToPlainText函数以正确处理块级和行内公式

## 问题描述

经过测试`@aarkue/tiptap-math-extension`的`getHTML()`实现逻辑发现：

1. **块级公式** `$$x^2$$` 的getHTML返回：
```html
<p>  <span data-latex="x^2" data-evaluate="no" data-display="yes" data-type="inlineMath">$x^2$</span></p><p></p>
```

2. **行内公式** `$x$` 的getHTML返回：
```html
<p>  <span data-latex="x^2" data-evaluate="no" data-display="no" data-type="inlineMath">$x^2$</span></p>
```

关键区别在于`data-display`属性：
- `data-display="yes"` 表示块级公式，需要使用`$$...$$`包裹
- `data-display="no"` 表示行内公式，需要使用`$...$`包裹

## 修改计划

### 步骤1：读取当前htmlToPlainText函数的代码
查看`main.js`文件第661行附近的`htmlToPlainText`函数完整代码

### 步骤2：修改htmlToPlainText函数
修改`htmlToPlainText`函数，增加以下逻辑：

1. **查找所有包含`data-type="inlineMath"`的`<span>`标签**
   - 这些是数学公式元素

2. **判断`data-display`属性值**
   - 如果`data-display="yes"`：这是块级公式，使用`$$...$$`包裹
   - 如果`data-display="no"`：这是行内公式，使用`$...$`包裹

3. **从`data-latex`属性获取公式内容**
   - 替换`<span>`标签为正确包裹格式的公式字符串

### 步骤3：编写新的处理逻辑

```javascript
htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // 处理数学公式标签
    const mathElements = temp.querySelectorAll('span[data-type="inlineMath"]');
    mathElements.forEach(span => {
        const latex = span.getAttribute('data-latex') || '';
        const display = span.getAttribute('data-display') || 'no';

        // 根据data-display属性判断是块级还是行内公式
        if (display === 'yes') {
            // 块级公式使用$$...$$
            span.replaceWith('$$' + latex + '$$');
        } else {
            // 行内公式使用$...$
            span.replaceWith('$' + latex + '$');
        }
    });

    // 处理 br 标签为换行符
    const brElements = temp.querySelectorAll('br');
    brElements.forEach(br => {
        br.replaceWith('\n');
    });

    // 处理 p 标签为换行符
    const pElements = temp.querySelectorAll('p');
    pElements.forEach(p => {
        const text = p.textContent || p.innerText || '';
        if (text) {
            p.replaceWith(text + '\n');
        } else {
            p.replaceWith('\n');
        }
    });

    return temp.textContent || temp.innerText || '';
}
```

### 步骤4：测试验证
- 使用块级公式`$$x^2+y^2=z^2$$`测试，应返回`$$x^2+y^2=z^2$$`
- 使用行内公式`$a+b$`测试，应返回`$a+b$`

## 文件位置
- 前端文件：`/home/zhao/project/auto-paper-system/frontend/js/main.js`
- 函数位置：约第661行
