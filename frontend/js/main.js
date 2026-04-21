/**
 * 自动组卷系统前端逻辑
 * 版本: 2.0 (带章节统计功能)
 */

class PaperComposer {
    constructor() {
        this.currentSubject = '';
        this.currentQuestionType = '判断题'; // 当前选中的题型
        this.paperTitle = ''; // 初始为空
        this.totalScore = 0;
        this.selectedQuestions = {};
        this.paperStructure = [];
        this.chapterStats = {}; // 新增：存储章节统计数据
        this.templates = [];
        this.bankData = {};
        this.totalQuestionCount = 0;
        this.isTemplateApplied = false; // 标记是否应用了模板
        this.appliedTemplateName = ''; // 当前应用的模板名称
        this.modalTimeout = null; // 添加模态框定时器引用
        this.currentUser = null; // 当前用户信息
        this.templateManageModal = null; // 模板管理模态框
        this.currentQuestionPath = ''; // 当前题目路径
        this.currentQuestionIndex = -1; // 当前题目索引
        
        // 初始化
        this.init();
    }
    
    async init() {
        console.log('自动组卷系统初始化...');
        
        // 检查KaTeX
        if (window.katex) {
            console.log('✅ KaTeX已加载');
        } else {
            console.warn('⚠️ KaTeX未加载，将使用动态加载');
        }
        
        // 更新当前时间
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        
        try {
            // 获取当前用户信息
            await this.loadCurrentUser();
            
            // 加载初始数据
            await Promise.all([
                this.loadSubjects()
                // 注意：不在这里加载模板，等待科目选择后再加载
            ]);
            
            // 初始化模板下拉框为禁用状态
            const templateSelect = document.getElementById('template-select');
            templateSelect.disabled = true;
            templateSelect.innerHTML = '<option value="">请先选择课程或科目</option>';
            
            // 隐藏管理模板按钮
            const manageBtn = document.getElementById('manage-templates-btn');
            if (manageBtn) {
                manageBtn.style.display = 'none';
            }
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 初始化选项卡
            this.initTypeTabs();
            
            console.log('系统初始化完成');
            this.showMessage('系统初始化完成', 'success');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showMessage('系统初始化失败，请刷新页面重试', 'error');
        }
    }
    
    async loadCurrentUser() {
        try {
            const response = await fetch('/api/current-user', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data;
                
                const usernameEl = document.getElementById('header-username');
                const roleEl = document.getElementById('header-role');
                const userManageBtn = document.getElementById('user-manage-btn');
                
                if (usernameEl) {
                    usernameEl.textContent = data.username || '用户';
                }
                if (roleEl) {
                    roleEl.textContent = data.role === 'admin' ? '管理员' : '教师';
                }
                if (userManageBtn) {
                    userManageBtn.style.display = data.role === 'admin' ? 'flex' : 'none';
                }
            } else {
                // 未登录，跳转到登录页
                window.location.href = '/';
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
    }
    
    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN');
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    
    async loadSubjects() {
        try {
            const response = await fetch('/api/subjects', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            const select = document.getElementById('subject-select');
            select.innerHTML = '<option value="">-- 请选择课程或科目 --</option>';
            
            data.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                select.appendChild(option);
            });
            
            console.log(`加载了 ${data.subjects.length} 个科目`);
        } catch (error) {
            console.error('加载科目失败:', error);
            this.showMessage('加载科目列表失败', 'error');
        }
    }
    
    async loadTemplates(subject = '') {
        try {
            // 如果没有传入科目，不加载模板
            if (!subject) {
                const templateSelect = document.getElementById('template-select');
                templateSelect.disabled = true;
                templateSelect.innerHTML = '<option value="">请先选择课程或科目</option>';
                
                // 隐藏管理按钮
                this.updateManageTemplatesButton();
                return;
            }
            
            // API请求中包含科目参数，只返回该科目的模板
            const response = await fetch(`/api/templates?subject=${encodeURIComponent(subject)}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.templates = data.templates; // 只存储当前科目的模板
            
            const select = document.getElementById('template-select');
            
            // 清空并重新构建下拉框
            select.innerHTML = '<option value="">-- 请选择组卷模板 --</option>';
            
            if (this.templates.length === 0) {
                // 如果没有模板，显示提示信息
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '该科目暂无模板';
                option.disabled = true;
                select.appendChild(option);
            } else {
                // 只显示当前科目的模板
                this.templates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.name;
                    
                    // 显示格式：模板名称 (试卷标题)
                    let displayText = template.display_name || template.name;
                    if (template.title && template.title !== template.display_name) {
                        displayText += ` - ${template.title}`;
                    }
                    
                    option.textContent = displayText;
                    option.title = `模板: ${template.display_name} | 科目: ${template.subject} | 创建: ${template.created_at || '未知'}`;
                    select.appendChild(option);
                });
            }
            
            console.log(`加载了 ${this.templates.length} 个模板 (科目: ${subject})`);
            
            // 更新管理按钮显示状态
            this.updateManageTemplatesButton();
            
        } catch (error) {
            console.error('加载模板失败:', error);
            this.showMessage('加载模板列表失败', 'error');
            
            // 出错时也要确保下拉框是可用状态
            const templateSelect = document.getElementById('template-select');
            templateSelect.disabled = false;
            templateSelect.innerHTML = '<option value="">-- 加载失败，请重试 --</option>';
            
            // 出错时隐藏管理按钮
            this.updateManageTemplatesButton();
        }
    }
    
    /**
     * 根据是否有模板更新管理按钮的显示状态
     */
    updateManageTemplatesButton() {
        const manageBtn = document.getElementById('manage-templates-btn');
        if (!manageBtn) return;
        
        // 只有选择了科目且有模板时才显示管理按钮
        if (this.currentSubject && this.templates && this.templates.length > 0) {
            manageBtn.style.display = 'inline-flex';
        } else {
            manageBtn.style.display = 'none';
        }
    }
    
    async loadBankStructure(subject) {
        try {
            this.showMessage(`正在加载 ${subject} 题库...`, 'info');
            
            const response = await fetch('/api/bank/structure', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data[subject]) {
                this.bankData = data;
                this.totalQuestionCount = this.calculateTotalQuestions(data[subject]);
                this.updateBankStats();
                
                // 渲染当前题型的章节
                this.renderCurrentTypeChapters();
                
                this.showMessage(`${subject} 题库加载完成`, 'success');
            } else {
                this.showEmptyBank();
                this.showMessage(`${subject} 暂无题库数据`, 'warning');
            }
        } catch (error) {
            console.error('加载题库结构失败:', error);
            this.showEmptyBank();
            this.showMessage('加载题库失败，请检查网络连接', 'error');
        }
    }
    
    calculateTotalQuestions(bankStructure) {
        let total = 0;
        for (const typeName in bankStructure) {
            const chapters = bankStructure[typeName];
            chapters.forEach(chapter => {
                chapter.topics.forEach(topic => {
                    total += topic.count;
                });
            });
        }
        return total;
    }
    
    updateBankStats() {
        const selectedCount = Object.values(this.selectedQuestions).reduce((sum, q) => sum + (q.count || 0), 0);
        document.getElementById('selected-count').textContent = selectedCount;
        document.getElementById('total-questions').textContent = this.totalQuestionCount;
    }
    
    // 初始化选项卡
    initTypeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.switchQuestionType(type);
                
                // 更新选项卡状态
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    // 切换题型
    switchQuestionType(type) {
        this.currentQuestionType = type;
        this.renderCurrentTypeChapters();
    }
    
    /**
 * 对章节进行排序，支持"第n章"、"第一章"等格式
 */
sortChapters(chapters) {
    return [...chapters].sort((a, b) => {
        const orderA = this.extractChapterOrder(a.name);
        const orderB = this.extractChapterOrder(b.name);
        return orderA - orderB;
    });
}

/**
 * 从章节名称中提取排序序号
 */
extractChapterOrder(chapterName) {
    if (!chapterName) return 999;
    
    // 匹配 "第1章" 格式（阿拉伯数字）
    const arabicMatch = chapterName.match(/第(\d+)章/);
    if (arabicMatch) {
        return parseInt(arabicMatch[1], 10);
    }
    
    // 匹配 "第一章" 格式（中文数字）
    const chineseNumbers = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
    };
    
    const chineseMatch = chapterName.match(/第([一二三四五六七八九十]+)章/);
    if (chineseMatch) {
        const chineseNum = chineseMatch[1];
        return chineseNumbers[chineseNum] || 999;
    }
    
    // 匹配 "1. xxx" 或 "1 xxx" 格式
    const numberMatch = chapterName.match(/^(\d+)[\.\s]|^(\d+)$/);
    if (numberMatch) {
        return parseInt(numberMatch[1] || numberMatch[2], 10);
    }
    
    return 999;
}

    // 渲染当前题型的章节
    renderCurrentTypeChapters() {
        const treeContainer = document.getElementById('bank-tree');
        
        if (!this.currentSubject || !this.bankData[this.currentSubject]) {
            treeContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>请先选择科目</p>
                    <p class="empty-hint">选择科目后，将显示${this.currentQuestionType}的题库</p>
                </div>
            `;
            return;
        }
        
        const subjectData = this.bankData[this.currentSubject];
       let typeData = subjectData[this.currentQuestionType] || [];
           typeData = this.sortChapters(typeData);
        
        if (typeData.length === 0) {
            treeContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>暂无${this.currentQuestionType}题库</p>
                    <p class="empty-hint">该科目暂无${this.currentQuestionType}的题目</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="current-type-indicator">
                <i class="fas fa-filter"></i>
                <span>当前显示: ${this.currentQuestionType}</span>
                ${this.isTemplateApplied ? 
                    `<span class="selection-badge" style="margin-left: auto; background: linear-gradient(135deg, #10b981, #059669);">
                        <i class="fas fa-clone"></i> 模板已应用
                    </span>` : ''}
            </div>
        `;
        
        typeData.forEach(chapter => {
            html += `<div class="chapter-section">
                <h4>
                    <i class="fas fa-folder-open"></i> ${chapter.name}
                    <span class="chapter-count">${chapter.topics.length}个考点</span>
                </h4>
                <div class="topics-list" style="display: block;">`;
            
            chapter.topics.forEach(topic => {
                const key = `${this.currentSubject}/${this.currentQuestionType}/${chapter.name}/${topic.name}`;
                const selection = this.selectedQuestions[key] || { count: 0, score: 0 };
                const percent = Math.round((selection.count / topic.count) * 100) || 0;
                
           // 题库选题进度条（下面空行）：  ${selection.count > 0 ? `<span class="selection-badge" title="已选${selection.count}题">${percent}%</span>` : ''}

                html += `<div class="topic-item" data-key="${key}" style="cursor: pointer;">
                    <div class="topic-info">
                        <i class="fas fa-file-alt"></i>
                        <span class="topic-name" title="${topic.name}">${topic.name}</span>
                        <span class="count-badge" title="共${topic.count}题">共${topic.count}题</span>
                        <span class="preview-badge" title="点击查看题目">
                            <i class="fas fa-chevron-down"></i>
                        </span>
                    </div>
                    <div class="topic-controls">
                        <div class="input-group">
                            <label class="input-label">选题</label>
                            <input type="number" 
                                   class="count-input" 
                                   min="0" 
                                   max="${topic.count}" 
                                   value="${selection.count}"
                                   placeholder="0"
                                   title="选题数量 (0-${topic.count})">
                        </div>
                        <div class="input-group">
                            <label class="input-label">赋分</label>
                            <input type="number"
                                   class="score-input"
                                   min="0"
                                   step="2"
                                   value="${selection.score}"
                                   placeholder="0"
                                   title="该考点题目总分">
                        </div>
                    </div>
                    <div class="topic-questions" style="display: none;">
                        <div class="topic-questions-content"></div>
                    </div>
                </div>`;
            });
            
            html += `</div></div>`;
        });
        
        treeContainer.innerHTML = html;
        
        this.bindChapterHeaders();
        this.bindTopicInputs();
        this.bindTopicPreview();
    }
    
    showEmptyBank() {
        const treeContainer = document.getElementById('bank-tree');
        treeContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <p>该科目暂无题库数据</p>
                <p class="empty-hint">请检查题库目录结构或选择其他科目</p>
            </div>
        `;
        this.totalQuestionCount = 0;
        this.updateBankStats();
    }
    
    bindChapterHeaders() {
        document.querySelectorAll('.chapter-section h4').forEach(header => {
            header.addEventListener('click', (e) => {
                const topicsList = e.currentTarget.nextElementSibling;
                const isCollapsed = topicsList.style.display === 'none';
                
                topicsList.style.display = isCollapsed ? 'block' : 'none';
                
                const icon = e.currentTarget.querySelector('i');
                if (icon) {
                    icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
                }
                
                if (isCollapsed) {
                    topicsList.style.opacity = '0';
                    topicsList.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        topicsList.style.opacity = '1';
                        topicsList.style.transform = 'translateY(0)';
                    }, 10);
                }
            });
            
            const icon = header.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    }
    
    bindTopicInputs() {
        document.querySelectorAll('.topic-item').forEach(item => {
            const countInput = item.querySelector('.count-input');
            const scoreInput = item.querySelector('.score-input');
            const key = item.dataset.key;
            
            const updateHandler = () => {
                const count = parseInt(countInput.value) || 0;
                const max = parseInt(countInput.getAttribute('max')) || 0;
                const score = parseFloat(scoreInput.value) || 0;
                
                if (count > max) {
                    countInput.value = max;
                    this.showMessage(`最多只能选择 ${max} 题`, 'warning');
                    this.updateSelection(key, max, score);
                } else if (count < 0) {
                    countInput.value = 0;
                    this.updateSelection(key, 0, score);
                } else {
                    this.updateSelection(key, count, score);
                }
                
                if (count > 0) {
                    item.classList.add('selected');
                    const percent = Math.round((count / max) * 100);
                    this.updateSelectionBadge(item, percent);
                } else {
                    item.classList.remove('selected');
                    this.updateSelectionBadge(item, 0);
                }
            };
            
            countInput.addEventListener('change', updateHandler);
            countInput.addEventListener('input', updateHandler);
            scoreInput.addEventListener('change', updateHandler);
            scoreInput.addEventListener('input', updateHandler);
        });
    }
    
    bindTopicPreview() {
        console.log('绑定考点预览事件');
        document.querySelectorAll('.topic-item').forEach(item => {
            console.log('找到考点项:', item);
            const topicInfo = item.querySelector('.topic-info');
            const questionsContainer = item.querySelector('.topic-questions');
            const questionsContent = item.querySelector('.topic-questions-content');
            const previewBadge = item.querySelector('.preview-badge');
            const key = item.dataset.key;
            
            console.log('考点项信息:', {
                topicInfo: !!topicInfo,
                questionsContainer: !!questionsContainer,
                questionsContent: !!questionsContent,
                previewBadge: !!previewBadge,
                key: key
            });
            
            if (topicInfo) {
                topicInfo.addEventListener('click', async (e) => {
                    console.log('点击考点:', key);
                    // 防止事件冒泡到其他元素
                    e.stopPropagation();
                    
                    // 切换题目预览的显示状态
                    const isVisible = questionsContainer.style.display === 'block';
                    
                    if (isVisible) {
                        // 收起题目预览
                        questionsContainer.style.display = 'none';
                        previewBadge.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    } else {
                        // 展开题目预览
                        previewBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        
                        try {
                            // 获取题目数据
                            console.log('获取题目数据:', key);
                            const questions = await this.getTopicQuestions(key);
                            console.log('获取到题目数据:', questions);
                            
                            // 渲染题目
                            console.log('渲染题目:', questions.length);
                            // 从key中提取题型信息
                            const parts = key.split('/');
                            const questionType = parts[1] || '未知题型';
                            await this.renderTopicQuestions(questionsContent, questions, questionType);
                            
                            // 显示题目预览
                            questionsContainer.style.display = 'block';
                            previewBadge.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        } catch (error) {
                            console.error('加载题目失败:', error);
                            questionsContent.innerHTML = '<div class="error-message">加载题目失败，请重试</div>';
                            questionsContainer.style.display = 'block';
                            previewBadge.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        }
                    }
                });
            }
        });
    }
    

    
    // 更新导出数据
    updateExportData() {
        const editors = window.editorInstances;
        if (!editors || !editors.stemEditor || !editors.answerEditor || !editors.analysisEditor) {
            return;
        }
        
        try {
            // 获取编辑器内容
            const stemContent = editors.stemEditor.getHTML();
            const answerContent = editors.answerEditor.getHTML();
            const analysisContent = editors.analysisEditor.getHTML();
            
            // 转换为纯文本，保留 $ 定界符
            let stemText = this.htmlToPlainText(stemContent);
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
            const exportDataElement = document.getElementById('export-data');
            if (exportDataElement) {
                exportDataElement.textContent = exportText;
            }
        } catch (error) {
            console.error('更新导出数据失败:', error);
        }
    }
    
    // HTML转纯文本，保留 $ 定界符
    htmlToPlainText(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        // 处理 br 标签为换行符
        const brElements = temp.querySelectorAll('br');
        brElements.forEach(br => {
            br.replaceWith('\n');
        });
        return temp.textContent || temp.innerText || '';
    }
    
    // 打开编辑对话框
    async openEditModal(questionIndex, question, questionType) {
        try {
            // 懒加载编辑器
            const editors = await window.loadEditors();
            
            if (!editors || !editors.stemEditor || !editors.answerEditor || !editors.analysisEditor) {
                this.showMessage('编辑器初始化失败，无法编辑题目', 'error');
                return;
            }
            
            // 显示题型信息
            const typeDisplay = document.getElementById('question-type-display');
            if (typeDisplay) {
                typeDisplay.textContent = questionType || question.type || '未知题型';
            }
            
            // 构建题干内容，对于选择题需要添加选项
            let stemContent = question.content;
            if (questionType === '选择题' && question.options && question.options.length > 0) {
                stemContent += '<br>' + question.options.join('<br>');
            }
            
            // 填充编辑器内容
            editors.stemEditor.commands.setContent(stemContent);
            editors.answerEditor.commands.setContent(this.escapeHtml(question.answer || ''));
            editors.analysisEditor.commands.setContent(this.escapeHtml(question.analysis || ''));
            
            // 显示对话框
            const modal = document.getElementById('question-edit-modal');
            if (modal) {
                modal.style.display = 'block';
            }
            
            // 更新导出数据
            this.updateExportData();
            
            // 为编辑器添加更新事件监听器
            editors.stemEditor.on('update', () => this.updateExportData());
            editors.answerEditor.on('update', () => this.updateExportData());
            editors.analysisEditor.on('update', () => this.updateExportData());
            
            // 为保存按钮添加点击事件监听器
            const saveButton = document.getElementById('edit-modal-save');
            if (saveButton) {
                saveButton.onclick = () => this.saveQuestion();
            }
            
            // 为关闭按钮添加点击事件监听器
            const closeButton = document.getElementById('edit-modal-close');
            if (closeButton) {
                closeButton.onclick = () => this.closeEditModal();
            }
        } catch (error) {
            console.error('打开编辑对话框失败:', error);
            this.showMessage('打开编辑对话框失败，请刷新页面重试', 'error');
        }
    }
    
    // 关闭编辑对话框
    closeEditModal() {
        const modal = document.getElementById('question-edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 保存题目
    async saveQuestion() {
        try {
            // 获取导出数据
            const exportDataElement = document.getElementById('export-data');
            if (!exportDataElement) {
                this.showMessage('无法获取导出数据', 'error');
                return;
            }
            
            const questionContent = exportDataElement.textContent;
            if (!questionContent) {
                this.showMessage('题目内容不能为空', 'error');
                return;
            }
            
            console.log('保存题目 - currentQuestionPath:', this.currentQuestionPath);
            console.log('保存题目 - currentQuestionIndex:', this.currentQuestionIndex);
            console.log('保存题目 - questionContent:', questionContent);
            
            if (!this.currentQuestionPath) {
                this.showMessage('题目路径无效，请重新打开编辑对话框', 'error');
                return;
            }
            
            if (this.currentQuestionIndex < 0) {
                this.showMessage('题目索引无效，请重新打开编辑对话框', 'error');
                return;
            }
            
            // 显示加载提示
            this.showMessage('正在保存题目，请稍候...', 'info');
            
            // 构建保存请求
            const response = await fetch('/api/bank/save-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: questionContent,
                    path: this.currentQuestionPath,
                    questionIndex: this.currentQuestionIndex
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                this.showMessage('题目保存成功', 'success');
                // 关闭对话框
                this.closeEditModal();
                // 刷新当前考点的题目
                this.refreshCurrentTopic();
            } else {
                this.showMessage('题目保存失败: ' + (result.message || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('保存题目失败:', error);
            this.showMessage('保存题目失败，请重试', 'error');
        }
    }
    
    // 刷新当前考点的题目
    async refreshCurrentTopic() {
        try {
            // 获取当前考点的容器
            const activeTopic = document.querySelector('.topic-item.active');
            if (activeTopic) {
                const key = activeTopic.dataset.key;
                const questionsContainer = activeTopic.querySelector('.questions-container');
                const questionsContent = activeTopic.querySelector('.questions-content');
                
                if (questionsContainer && questionsContent) {
                    // 显示加载状态
                    const previewBadge = activeTopic.querySelector('.preview-badge');
                    if (previewBadge) {
                        previewBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    }
                    
                    // 重新加载题目
                    const questions = await this.getTopicQuestions(key);
                    await this.renderTopicQuestions(questionsContent, questions, key.split('/')[1]);
                    
                    // 保持展开状态
                    questionsContainer.style.display = 'block';
                    if (previewBadge) {
                        previewBadge.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    }
                }
            }
        } catch (error) {
            console.error('刷新题目失败:', error);
        }
    }
    
    async getTopicQuestions(key) {
        try {
            console.log('获取题目数据开始:', key);
            // 解析key以获取文件路径
            // key格式: 科目/题型/章节/知识点
            const parts = key.split('/');
            if (parts.length < 4) {
                throw new Error('无效的考点key');
            }
            
            // 构建文件路径
            const [subject, questionType, chapter, topic] = parts;
            const filePath = `${subject}/${questionType}/${chapter}/${topic}.md`;
            
            console.log('构建文件路径:', filePath);
            
            const response = await fetch(`/api/bank/questions?path=${encodeURIComponent(filePath)}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            console.log('API请求状态:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到题目数据:', data);
            return data.questions || [];
        } catch (error) {
            console.error('获取题目失败:', error);
            throw error;
        }
    }
    
    async renderTopicQuestions(container, questions, questionType) {
    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="empty-questions">该考点暂无题目</div>';
        return;
    }
    
    console.log('开始渲染题目，KaTeX状态:', !!window.katex);
    
    let html = '';
    questions.forEach((question, index) => {
        let questionContent = this.extractQuestionContent(question.content);
        
        // 先只渲染题干（不包含选项）
        html += `<div class="question-item" data-qidx="${index}">
            <span class="question-number">${index + 1}.</span>
            <div class="question-content">${this.escapeHtml(questionContent)}</div>
            <button class="edit-button" data-question-index="${index}" data-question-type="${questionType}">编辑</button>
        </div>`;
    });
    
    container.innerHTML = html;
    
    // 为编辑按钮绑定点击事件
    container.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const questionIndex = parseInt(button.dataset.questionIndex);
            const question = questions[questionIndex];
            const questionType = button.dataset.questionType;
            // 设置当前题目路径和索引
            const topicItem = button.closest('.topic-item');
            console.log('编辑按钮点击 - topicItem:', topicItem);
            if (topicItem) {
                const key = topicItem.dataset.key;
                console.log('编辑按钮点击 - key:', key);
                const parts = key.split('/');
                if (parts.length >= 4) {
                    const [subject, qType, chapter, topic] = parts;
                    this.currentQuestionPath = `${subject}/${qType}/${chapter}/${topic}.md`;
                    console.log('编辑按钮点击 - currentQuestionPath:', this.currentQuestionPath);
                }
                // 设置当前题目索引
                this.currentQuestionIndex = questionIndex;
                console.log('编辑按钮点击 - currentQuestionIndex:', this.currentQuestionIndex);
            }
            this.openEditModal(questionIndex, question, questionType);
        });
    });
    
    // 第一步：KaTeX 渲染题干中的公式
    if (window.renderMathInElement) {
        renderMathInElement(container, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false
        });
    } else if (window.katex) {
        // 【保留降级方案】如果 auto-render 未加载，使用手动渲染
        console.log('使用 KaTeX 手动渲染公式');
        const questionContents = container.querySelectorAll('.question-content');
        questionContents.forEach((element, idx) => {
            if (idx < questions.length) {
                const questionContent = this.extractQuestionContent(questions[idx].content);
                try {
                    let renderedContent = questionContent;
                    renderedContent = renderedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
                        try { return window.katex.renderToString(formula, { throwOnError: false, displayMode: true }); } catch (e) { return match; }
                    });
                    renderedContent = renderedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
                        try { return window.katex.renderToString(formula, { throwOnError: false, displayMode: true }); } catch (e) { return match; }
                    });
                    renderedContent = renderedContent.replace(/\$([^$]*?)\$/g, (match, formula) => {
                        try { return window.katex.renderToString(formula, { throwOnError: false, displayMode: false }); } catch (e) { return match; }
                    });
                    element.innerHTML = renderedContent;
                } catch (e) {
                    element.innerHTML = this.escapeHtml(questionContent);
                }
            }
        });
    } else {
        console.warn('KaTeX 未加载，无法渲染公式');
    }
    
    // 第二步：通过 DOM 操作添加选项（不会被转义）
    questions.forEach((question, idx) => {
        if (question.options && question.options.length > 0) {
            const questionItem = container.querySelector(`.question-item[data-qidx="${idx}"]`);
            if (questionItem) {
                const contentDiv = questionItem.querySelector('.question-content');
                if (contentDiv) {
                    // 创建换行元素
                    const br = document.createElement('br');
                    contentDiv.appendChild(br);
                    
                    // 创建选项容器
                    const optionsSpan = document.createElement('span');
                    optionsSpan.className = 'question-options';
                    optionsSpan.innerHTML = ' ' + question.options.join('  ');
                    contentDiv.appendChild(optionsSpan);
                    
                    // 第三步：单独渲染选项中的公式
                    if (window.renderMathInElement) {
                        renderMathInElement(optionsSpan, {
                            delimiters: [
                                {left: '$', right: '$', display: false},
                                {left: '\\(', right: '\\)', display: false}
                            ],
                            throwOnError: false
                        });
                    } else if (window.katex) {
                        // 降级：手动渲染选项中的公式
                        let optContent = optionsSpan.innerHTML;
                        optContent = optContent.replace(/\$([^$]*?)\$/g, (match, formula) => {
                            try { return window.katex.renderToString(formula, { throwOnError: false, displayMode: false }); } catch (e) { return match; }
                        });
                        optionsSpan.innerHTML = optContent;
                    }
                }
            }
        }
    });
}
    
    // 添加一个辅助方法转义HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    extractQuestionContent(content) {
    // 提取题目部分，不包含答案和解析
    // 但保留选择题的选项（选项在答案之前）
    
    // 先找到"答案："的位置
    const answerIndex = content.search(/\n答案[：:]/i);
    if (answerIndex !== -1) {
        // 只截取到"答案："之前的内容，这已经包含了题干和选项
        return content.substring(0, answerIndex);
    }
    
    // 如果没有"答案："，再尝试找"解析："
    const analysisIndex = content.search(/\n解析[：:]/i);
    if (analysisIndex !== -1) {
        return content.substring(0, analysisIndex);
    }
    
    return content;
}
   

    updateSelectionBadge(item, percent) {
        let badge = item.querySelector('.selection-badge');
        if (percent > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'selection-badge';
                item.querySelector('.topic-info').appendChild(badge);
            }
            badge.textContent = `${percent}%`;
            badge.style.background = percent >= 100 ? 
                'linear-gradient(135deg, #10b981, #059669)' :
                'linear-gradient(135deg, #3b82f6, #2563eb)';
        } else if (badge) {
            badge.remove();
        }
    }
    
    /**
     * 更新选题 - 同时记录章节信息
     */
    updateSelection(key, count, score) {
        const parts = key.split('/'); // 格式: 科目/题型/章节/知识点
        const chapterName = parts[2]; // 章节名称
        const topicName = parts[3];   // 知识点名称
        
        if (count === 0 && score === 0) {
            delete this.selectedQuestions[key];
        } else {
            this.selectedQuestions[key] = { 
                count, 
                score,
                chapter: chapterName,
                topic: topicName
            };
        }
        
        if (this.isTemplateApplied && (count > 0 || score > 0)) {
            this.isTemplateApplied = false;
            this.appliedTemplateName = '';
            document.getElementById('paper-structure').classList.remove('template-applied');
        }
        
        this.updateStatistics();
        this.updateUI();
        this.renderCurrentTypeChapters();
    }
    
    /**
     * 更新统计信息 - 同时统计题型和章节
     */
    updateStatistics() {
        if (Object.keys(this.selectedQuestions).length > 0) {
            const typeStats = {};
            this.chapterStats = {}; // 重置章节统计
            let totalQuestions = 0;
            let totalScore = 0;
            
            for (const [key, selection] of Object.entries(this.selectedQuestions)) {
                const parts = key.split('/');
                if (parts.length >= 3 && selection.count > 0) {
                    const typeName = parts[1];
                    const chapterName = parts[2];
                    const count = selection.count || 0;
                    const score = selection.score || 0;
                    
                    // 按题型统计
                    if (!typeStats[typeName]) {
                        typeStats[typeName] = { count: 0, score: 0 };
                    }
                    typeStats[typeName].count += count;
                    typeStats[typeName].score += score;
                    
                    // 按章节统计
                    if (!this.chapterStats[chapterName]) {
                        this.chapterStats[chapterName] = { count: 0, score: 0 };
                    }
                    this.chapterStats[chapterName].count += count;
                    this.chapterStats[chapterName].score += score;
                    
                    totalQuestions += count;
                    totalScore += score;
                }
            }
            
            const typeOrder = [
                '判断题',
                '选择题',
                '填空题', 
                '计算题',
                '解答题',
                '应用题',
                '证明题'
            ];
            
            this.paperStructure = typeOrder
                .filter(typeName => typeStats[typeName] && typeStats[typeName].count > 0)
                .map((typeName, index) => ({
                    type_name: typeName,
                    order: index + 1,
                    question_count: typeStats[typeName].count,
                    total_score: typeStats[typeName].score
                }));
            
            this.totalScore = totalScore;
        } else {
            this.paperStructure = [];
            this.chapterStats = {};
            this.totalScore = 0;
        }
        
        this.updateBankStats();
    }
    
    /**
     * 根据当前选题计算章节统计（单独的方法，供模板应用时调用）
     */
    calculateChapterStats() {
        this.chapterStats = {};
        
        if (Object.keys(this.selectedQuestions).length === 0) {
            return;
        }
        
        for (const [key, selection] of Object.entries(this.selectedQuestions)) {
            const parts = key.split('/');
            if (parts.length >= 3 && selection.count > 0) {
                const chapterName = parts[2]; // 章节名称
                const count = selection.count || 0;
                const score = selection.score || 0;
                
                if (!this.chapterStats[chapterName]) {
                    this.chapterStats[chapterName] = { count: 0, score: 0 };
                }
                this.chapterStats[chapterName].count += count;
                this.chapterStats[chapterName].score += score;
            }
        }
        
        console.log('章节统计已更新:', this.chapterStats);
    }
    
    updateUI() {
        this.renderPaperStructure();
        this.renderChapterStats(); // 新增：渲染章节统计
        
        document.getElementById('current-total').textContent = this.totalScore;
        document.getElementById('structure-count').textContent = `共 ${this.paperStructure.length} 种题型`;
        
        const titleInput = document.getElementById('paper-title');
        if (titleInput.value !== this.paperTitle) {
            this.paperTitle = titleInput.value;
        }
    }
    
        /**
     * 渲染试卷结构（题型）
     */
    renderPaperStructure() {
        const container = document.getElementById('paper-structure');
        
        if (this.paperStructure.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>暂无题型</p>
                    <p class="empty-hint">请从右侧题库选择题目</p>
                </div>
            `;
            return;
        }
        
        // 题型分布标题
        let html = `
            <div class="chapter-stats-section">  <!-- 使用和章节分布相同的类名 -->
                <h3 class="chapter-stats-title">  <!-- 使用和章节分布相同的标题样式 -->
                    <i class="fas fa-layer-group"></i> 题型分布
                </h3>
                <div>  <!-- 使用和章节分布相同的网格布局 -->
        `;           

        this.paperStructure.forEach((section, index) => {
            const colorClass = this.getTypeColorClass(section.type_name);
            const icon = this.getTypeIcon(section.type_name);
            const perQuestionScore = section.question_count > 0 ? 
                (section.total_score / section.question_count).toFixed(1) : 0;
            const percentage = this.totalScore > 0 ? 
            ((section.total_score / this.totalScore) * 100).toFixed(1) : 0;
            
            html += `
                <div class="structure-item" style="border-left-color: ${colorClass};">
                    <div class="structure-header">
                        <div class="structure-title">
                            <i class="fas ${icon}"></i>
                            ${this.getChineseNumber(index + 1)}、${section.type_name}
                       <span style="font-weight: normal; color: #64748b; margin-left: 8px;">
                            （共${section.question_count}题，每题${perQuestionScore}分，共${section.total_score}分）
                        </span>                          
                        </div>
                        <div class=""type-stat-header">
                            <span class="chapter-percentage">(占比${percentage}%)</span>
                        </div>
                    </div>
                </div>
            `;
        });
                         
            html += `
                </div>
            </div>
        `;


        // 保存题型HTML，后面会与章节统计合并
        this.typeStructureHtml = html;
    }


   /* <span class="type-stat-percentage">（共${section.question_count}题，
                        ${section.question_count > 0 ? `每题${perQuestionScore}分` : ''}, 共${section.total_score}分）</span> */

    /**
     * 渲染章节/知识点统计信息
     */
    renderChapterStats() {
        const container = document.getElementById('paper-structure');
        
        // 如果没有题型，显示空状态
        if (this.paperStructure.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>暂无题型</p>
                    <p class="empty-hint">请从右侧题库选择题目</p>
                </div>
            `;
            return;
        }
        
        // 构建章节统计HTML
        let chapterHtml = '';
        if (this.chapterStats && Object.keys(this.chapterStats).length > 0) {
            chapterHtml = `
                <div class="chapter-stats-section">
                    <h3 class="chapter-stats-title">
                        <i class="fas fa-book-open"></i> 章节分布
                    </h3>
                    <div class="chapter-stats-grid">
            `;
            
            // 按章节名称排序
           // const sortedChapters = Object.keys(this.chapterStats).sort();
            // 自定义章节排序函数
            const sortedChapters = Object.keys(this.chapterStats).sort((a, b) => {
                // 提取章节数字
                const numA = parseInt(a.match(/\d+/)?.[0] || 0);
                const numB = parseInt(b.match(/\d+/)?.[0] || 0);
                return numA - numB;
            });
            sortedChapters.forEach(chapter => {
                const stat = this.chapterStats[chapter];
                const percentage = this.totalScore > 0 ? ((stat.score / this.totalScore) * 100).toFixed(1) : 0;
                
                chapterHtml += `
                    <div class="chapter-stat-item">
                        <div class="chapter-stat-header">
                            <span class="chapter-name" title="${chapter}">${chapter}</span>
                            <span class="chapter-percentage">占比${percentage}%</span>
                        </div>
                        <div class="chapter-stat-details">
                            <span class="chapter-count"><i class="fas fa-list-ol"></i> 共${stat.count}题</span>
                            <span class="chapter-score"><i class="fas fa-star"></i> 共${stat.score}分</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                `;
            });
            
            chapterHtml += `
                    </div>
                </div>
            `;
        }
        
        // 合并显示 - 减小间距，让布局更紧凑
        container.innerHTML = this.typeStructureHtml + 
            (chapterHtml ? `<div style="margin-top: 0.5rem;"></div>${chapterHtml}` : '');

        // 合并显示题型结构和章节统计
       // container.innerHTML = this.typeStructureHtml + 
        //    (chapterHtml ? `<div class="stats-divider"></div>${chapterHtml}` : '');
    }
    
    getTypeColorClass(typeName) {
        const colorMap = {
            '选择题': '#3498db',
            '判断题': '#f39c12',
            '填空题': '#2ecc71',
            '计算题': '#e74c3c',
            '解答题': '#9b59b6',
            '应用题': '#1abc9c',
            '证明题': '#34495e'
        };
        return colorMap[typeName] || '#3498db';
    }
    
    getTypeIcon(typeName) {
        const iconMap = {
            '选择题': 'fa-check-circle',
            '判断题': 'fa-question-circle',
            '填空题': 'fa-pencil-alt',
            '计算题': 'fa-calculator',
            '解答题': 'fa-comments',
            '应用题': 'fa-chart-line',
            '证明题': 'fa-gavel'
        };
        return iconMap[typeName] || 'fa-file-alt';
    }
    
    getChineseNumber(num) {
        const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
        return chineseNumbers[num - 1] || num.toString();
    }
    
    /**
     * 应用模板 - 更新章节统计
     */
    async applyTemplate(templateName) {
        try {
            if (!this.currentSubject) {
                this.showMessage('请先选择科目', 'warning');
                return;
            }
            
            this.showMessage(`正在加载模板: ${templateName}...`, 'info');
            
            const response = await fetch(`/api/templates/${encodeURIComponent(templateName)}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const template = await response.json();
            
            if (!template || !template.selections) {
                throw new Error('模板数据无效');
            }
            
            // 模板科目应该已经匹配，但保留检查作为安全措施
            if (template.subject && template.subject !== this.currentSubject) {
                this.showMessage(`此模板属于"${template.subject}"科目，与当前选择的科目不匹配`, 'warning');
                document.getElementById('template-select').value = '';
                return;
            }
            
            // 清空当前选择
            this.selectedQuestions = {};
            
            // 设置模板数据
            for (const [key, selection] of Object.entries(template.selections)) {
                this.selectedQuestions[key] = selection;
            }
            
            // 设置试卷结构（如果有）
            if (template.sections) {
                this.paperStructure = template.sections;
            }
            
            // 重新计算章节统计（基于新模板的选题）
            this.calculateChapterStats();
            
            // 计算总分
            this.totalScore = Object.values(this.selectedQuestions).reduce(
                (sum, sel) => sum + (sel.score || 0), 0
            );
            
            // 设置模板应用状态
            this.isTemplateApplied = true;
            this.appliedTemplateName = templateName;
            
            // 更新UI - 现在会同时显示新模板的题型和章节统计
            this.updateUI();
            this.renderCurrentTypeChapters();
            // 关键修复：更新题库统计，刷新"已选: X题"
            this.updateBankStats();
            
            // 添加视觉反馈
            document.getElementById('paper-structure').classList.add('template-applied');
            setTimeout(() => {
                document.getElementById('paper-structure').classList.remove('template-applied');
            }, 2000);
            
            this.showMessage(`已应用模板: ${template.name || templateName}`, 'success');
            
        } catch (error) {
            console.error('应用模板失败:', error);
            this.showMessage('应用模板失败: ' + error.message, 'error');
            document.getElementById('template-select').value = '';
        }
    }
    
    /**
     * 清空模板应用状态 - 同时清空章节统计
     */
    clearTemplateApplication() {
        // 清除模板应用状态
        this.isTemplateApplied = false;
        this.appliedTemplateName = '';
        document.getElementById('paper-structure').classList.remove('template-applied');
        
        // 清空当前选择的题目
        this.selectedQuestions = {};
        this.paperStructure = [];
        this.chapterStats = {}; // 清空章节统计
        this.totalScore = 0;
        
        // 更新UI
        this.updateUI();
        this.renderCurrentTypeChapters();
         // 关键修复：更新题库统计，刷新"已选: 0题"
        this.updateBankStats();
        
        // 清空模板选择框
        const templateSelect = document.getElementById('template-select');
        if (templateSelect) {
            templateSelect.value = '';
        }
        
        this.showMessage('已清空模板应用', 'info');
    }
    
    async saveAsTemplate() {
        if (this.paperStructure.length === 0) {
            this.showMessage('请先选择题目再保存模板', 'warning');
            return;
        }
        
        if (!this.currentSubject) {
            this.showMessage('请先选择科目', 'warning');
            return;
        }
        
        let defaultName = this.paperTitle;
        if (defaultName.length > 20) {
            defaultName = defaultName.substring(0, 20) + '...';
        }
        
        const templateName = prompt('请输入模板名称，系统会自动添加后缀（+试卷标题）:', '');
        if (!templateName || !templateName.trim()) {
            return;
        }
        
        if (templateName.trim() === this.paperTitle) {
            const useTitle = confirm('模板名称与试卷标题相同，建议使用不同的名称以便区分。\n是否继续使用此名称？');
            if (!useTitle) {
                return;
            }
        }
        
        const templateData = {
            name: templateName.trim(),
            title: this.paperTitle,
            subject: this.currentSubject,
            created_at: new Date().toISOString().split('T')[0],
            total_score: this.totalScore,
            sections: this.paperStructure,
            selections: this.selectedQuestions
            // 不需要保存 chapterStats，因为它可以从 selections 重新计算
        };
        
        try {
            this.showMessage('正在保存模板...', 'info');
            
            const response = await fetch('/api/templates/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData),
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success) {
                this.showMessage('模板保存成功', 'success');
                
                // 保存成功后，刷新当前科目的模板列表
                await this.loadTemplates(this.currentSubject);
                
                // 自动选中刚刚保存的模板
                const newTemplateName = `${this.currentUser?.user_id}_${templateName.trim()}`;
                console.log('新保存的模板名称:', newTemplateName);
                
                const templateExists = this.templates.some(t => t.name === newTemplateName);
                
                if (templateExists) {
                    const templateSelect = document.getElementById('template-select');
                    templateSelect.value = newTemplateName;

                     // 自动应用新保存的模板
                    await this.applyTemplate(newTemplateName);
                    
                    console.log('已自动选中新保存的模板');
                }
                
                this.updateManageTemplatesButton();
                
            } else {
                throw new Error(result.error || '保存失败');
            }
        } catch (error) {
            console.error('保存模板失败:', error);
            this.showMessage('保存模板失败: ' + error.message, 'error');
        }
    }
    
    async generatePaper() {
        if (this.paperStructure.length === 0) {
            this.showMessage('请先选择题目', 'warning');
            return;
        }
        
        if (!this.paperTitle.trim()) {
            this.showMessage('请输入试卷标题', 'warning');
            return;
        }
        
        if (!this.currentSubject) {
            this.showMessage('请选择科目', 'warning');
            return;
        }
        
        const paperCount = parseInt(document.getElementById('paper-count').value) || 1;
        if (paperCount < 1 || paperCount > 10) {
            this.showMessage('组卷套数必须在1-10之间', 'warning');
            return;
        }
        
        const paperData = {
            title: this.paperTitle,
            subject: this.currentSubject,
            total_score: this.totalScore,
            sections: this.paperStructure,
            selections: this.selectedQuestions,
            paper_count: paperCount
        };
        
        try {
            this.showMessage(`正在生成 ${paperCount} 套试卷...`, 'info');
            
            const response = await fetch('/api/paper/generate-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paperData),
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success) {
                this.lastGeneratedFolder = result.folder_name;
                
                let message = `成功生成 ${paperCount} 套试卷！\n\n`;
                result.files.forEach((file, index) => {
                    message += `第${index + 1}套:\n`;
                    if (file.student_word_path) {
                        message += `  Word版: ${file.student_file.replace('.md', '.docx')}\n`;
                    }
                    if (file.teacher_word_path) {
                        message += `  Word版: ${file.teacher_file.replace('.md', '.docx')}\n`;
                    }
                    message += '\n';
                });
                
                this.showWordDownloadableMessage(message, result.folder_name);
            } else {
                throw new Error(result.error || '生成失败');
            }
        } catch (error) {
            console.error('生成试卷失败:', error);
            this.showMessage('生成试卷失败: ' + error.message, 'error');
        }
    }
    
    showWordDownloadableMessage(content, folderName) {
        const modal = document.getElementById('message-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalFooter = document.querySelector('.modal-footer');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalTitle.textContent = '试卷生成成功';
        modalTitle.style.color = '#10b981';
        
        modalMessage.innerHTML = `<pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto; padding: 10px; background: #f8fafc; border-radius: 8px;">${content}</pre>`;
        
        modalFooter.innerHTML = '';
        
        const downloadWordBtn = document.createElement('button');
        downloadWordBtn.className = 'btn btn-success';
        downloadWordBtn.innerHTML = '<i class="fas fa-file-word"></i> 下载Word试卷';
        downloadWordBtn.style.marginRight = '0';
        downloadWordBtn.style.width = '100%';
        downloadWordBtn.onclick = async () => {
            // 显示加载状态
            downloadWordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在准备下载...';
            downloadWordBtn.disabled = true;
            
            try {
                await this.downloadWordPapers(folderName);
                // 下载完成后关闭模态框
                modal.classList.remove('show');
            } catch (error) {
                console.error('下载失败:', error);
                this.showMessage('下载失败: ' + error.message, 'error');
                // 恢复按钮状态
                downloadWordBtn.innerHTML = '<i class="fas fa-file-word"></i> 下载Word试卷';
                downloadWordBtn.disabled = false;
            }
        };
        
        modalFooter.appendChild(downloadWordBtn);
        modal.classList.add('show');
        
        if (this.modalTimeout) {
            clearTimeout(this.modalTimeout);
            this.modalTimeout = null;
        }
    }
    
    async downloadWordPapers(folderName) {
        try {
            const a = document.createElement('a');
            a.href = `/api/paper/download-word/${encodeURIComponent(folderName)}`;
            a.download = `${folderName}_Word版.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('下载失败:', error);
            this.showMessage('下载失败: ' + error.message, 'error');
        }
    }
    
    clearSelections() {
        if (Object.keys(this.selectedQuestions).length === 0) {
            this.showMessage('当前没有选择任何题目', 'info');
            return;
        }
        
        if (confirm('确定要清空所有选择吗？这将同时清除模板应用状态。')) {
            this.selectedQuestions = {};
            this.isTemplateApplied = false;
            this.appliedTemplateName = '';
            this.paperStructure = [];
            this.chapterStats = {}; // 清空章节统计
            this.totalScore = 0;
            
            // 清空模板选择框
            const templateSelect = document.getElementById('template-select');
            if (templateSelect) {
                templateSelect.value = '';
            }
            
            document.getElementById('paper-structure').classList.remove('template-applied');
            
            this.updateStatistics();
            this.updateUI();
            this.renderCurrentTypeChapters();
            
            this.showMessage('已清空所有选择', 'success');
        }
    }
    
    previewPaper() {
        if (this.paperStructure.length === 0) {
            this.showMessage('请先选择题目', 'warning');
            return;
        }
        
        let previewText = `试卷详情: ${this.paperTitle}\n`;
        previewText += `科目: ${this.currentSubject}\n`;
        previewText += `总分: ${this.totalScore}分\n`;
        previewText += `组卷套数: ${document.getElementById('paper-count').value}套\n\n`;
        
        previewText += '试卷结构:\n';
        this.paperStructure.forEach(section => {
            previewText += `  ${section.type_name}: ${section.question_count}题 (${section.total_score}分)\n`;
        });
        
        previewText += '\n选题详情:\n';
        
        this.paperStructure.forEach(section => {
            const typeName = section.type_name;
            let hasTypeQuestions = false;
            let typeQuestions = '';
            
            for (const [key, selection] of Object.entries(this.selectedQuestions)) {
                if (selection.count > 0) {
                    const parts = key.split('/');
                    if (parts[1] === typeName) {
                        typeQuestions += `    ${parts[2]}/${parts[3]}: ${selection.count}题 (${selection.score}分)\n`;
                        hasTypeQuestions = true;
                    }
                }
            }
            
            if (hasTypeQuestions) {
                previewText += `  ${typeName}:\n${typeQuestions}`;
            }
        });
        
        // 添加章节统计预览
        if (this.chapterStats && Object.keys(this.chapterStats).length > 0) {
            previewText += '\n章节分布:\n';
            const sortedChapters = Object.keys(this.chapterStats).sort();
            sortedChapters.forEach(chapter => {
                const stat = this.chapterStats[chapter];
                const percentage = ((stat.score / this.totalScore) * 100).toFixed(1);
                previewText += `  ${chapter}: 共${stat.count}题，${stat.score}分 (${percentage}%)\n`;
            });
        }
        
        this.showPreviewModal(previewText);
    }
    
    showPreviewModal(content) {
        const modal = document.getElementById('message-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalTitle.textContent = '试卷详情预览';
        modalTitle.style.color = '#3498db';
        
        modalMessage.innerHTML = `<pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto; padding: 10px; background: #f8fafc; border-radius: 8px;">${content}</pre>`;
        
        modalConfirm.textContent = '关闭';
        modal.classList.add('show');
        
        const newConfirm = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirm, modalConfirm);
        
        newConfirm.addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        modal.addEventListener('click', function closeHandler(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                modal.removeEventListener('click', closeHandler);
            }
        });
    }
    
    showMessage(message, type = 'info', duration = 3000) {
        const modal = document.getElementById('message-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalFooter = document.querySelector('.modal-footer');
        
        // 清空并重新创建确认按钮，确保每次都有有效的按钮
        modalFooter.innerHTML = '';
        
        const modalConfirm = document.createElement('button');
        modalConfirm.id = 'modal-confirm';
        modalConfirm.className = 'btn btn-primary';
        modalConfirm.textContent = '确定';
        modalConfirm.style.display = 'inline-block';
        modalFooter.appendChild(modalConfirm);
        
        const titleMap = {
            'success': '成功',
            'error': '错误',
            'warning': '警告',
            'info': '提示'
        };
        
        modalTitle.textContent = titleMap[type] || '提示';
        modalMessage.textContent = message;
        
        const colorMap = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        
        modalTitle.style.color = colorMap[type] || '#3b82f6';
        
        modal.classList.add('show');
        
        // 添加确认按钮点击事件
        modalConfirm.addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        if (this.modalTimeout) {
            clearTimeout(this.modalTimeout);
        }
        
        if (duration > 0) {
            this.modalTimeout = setTimeout(() => {
                modal.classList.remove('show');
                this.modalTimeout = null;
            }, duration);
        }
    }
    
    async showUserManageModal() {
        const modal = document.getElementById('user-manage-modal');
        const userList = document.getElementById('user-list');
        
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });
            const data = await response.json();
            
            userList.innerHTML = '';
            data.users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.id}</td>
                    <td>${user.role === 'admin' ? '管理员' : '普通用户'}</td>
                    <td>${user.created_at || '-'}</td>
                    <td class="user-actions">
                        <button class="btn btn-small btn-secondary reset-password-btn" data-id="${user.id}">重置密码</button>
                        ${user.id !== this.currentUser?.user_id ? 
                            `<button class="btn btn-small btn-danger delete-user-btn" data-id="${user.id}">删除</button>` : 
                            '<span class="text-muted">当前用户</span>'}
                    </td>
                `;
                userList.appendChild(tr);
            });
            
            document.querySelectorAll('.reset-password-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const userId = e.target.dataset.id;
                    const newPassword = prompt('请输入新密码:');
                    if (newPassword) {
                        await this.resetUserPassword(userId, newPassword);
                    }
                });
            });
            
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const userId = e.target.dataset.id;
                    if (confirm('确定要删除该用户吗？此操作不可恢复！')) {
                        await this.deleteUser(userId);
                    }
                });
            });
            
            document.getElementById('create-user-btn').onclick = async () => {
                const username = document.getElementById('new-username').value;
                const password = document.getElementById('new-password').value;
                const role = document.getElementById('new-role').value;
                
                if (!username || !password) {
                    this.showMessage('用户名和密码不能为空', 'warning');
                    return;
                }
                
                try {
                    const response = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password, role }),
                        credentials: 'include'
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        this.showMessage('用户创建成功', 'success');
                        document.getElementById('new-username').value = '';
                        document.getElementById('new-password').value = '';
                        this.showUserManageModal();
                    } else {
                        this.showMessage(result.error || '创建失败', 'error');
                    }
                } catch (error) {
                    this.showMessage('创建失败: ' + error.message, 'error');
                }
            };
            
            document.getElementById('user-manage-exit').onclick = () => {
                modal.classList.remove('show');
            };
            
            modal.querySelector('.modal-close').onclick = () => {
                modal.classList.remove('show');
            };
            
            // 移除点击背景关闭功能
            
            modal.classList.add('show');
        } catch (error) {
            this.showMessage('加载用户列表失败', 'error');
        }
    }
    
    async resetUserPassword(userId, newPassword) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                this.showMessage('密码重置成功', 'success');
                this.showUserManageModal();
            } else {
                this.showMessage(result.error || '重置失败', 'error');
            }
        } catch (error) {
            this.showMessage('重置失败: ' + error.message, 'error');
        }
    }
    
    async deleteUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                this.showMessage('用户已删除', 'success');
                this.showUserManageModal();
            } else {
                this.showMessage(result.error || '删除失败', 'error');
            }
        } catch (error) {
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }
    
    async showTemplateManageModal() {
        const modal = document.getElementById('template-manage-modal');
        const subjectSpan = document.getElementById('template-manage-subject');
        const templateList = document.getElementById('template-list');
        const emptyState = document.getElementById('template-empty-state');
        
        subjectSpan.textContent = this.currentSubject;
        templateList.innerHTML = '';
        
        if (!this.templates || this.templates.length === 0) {
            templateList.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            templateList.style.display = 'table-row-group';
            emptyState.style.display = 'none';
            
            this.templates.forEach(template => {
                const tr = document.createElement('tr');
                
                const nameTd = document.createElement('td');
                nameTd.className = 'template-name';
                nameTd.textContent = template.display_name || template.name.replace(`${this.currentUser?.user_id}_`, '');
                
                const actionsTd = document.createElement('td');
                actionsTd.className = 'template-actions';

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-delete-template';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> 删除';
                deleteBtn.setAttribute('data-template-name', template.name);

                deleteBtn.onclick = function(e) {
                    if (e) e.stopPropagation();
                    if (e) e.preventDefault();
                    console.log('删除按钮被点击，模板:', template);
                    window.paperComposer.confirmDeleteTemplate(template);
                    return false;
                };

                actionsTd.appendChild(deleteBtn);
                
                tr.appendChild(nameTd);
                tr.appendChild(actionsTd);
                
                templateList.appendChild(tr);
            });
        }

        modal.classList.add('show');
    }
    
    confirmDeleteTemplate(template) {
        const templateName = template.display_name || template.name.replace(`${this.currentUser?.user_id}_`, '');
        
        console.log('confirmDeleteTemplate被调用，模板:', template);
        
        if (confirm(`确定要删除模板 "${templateName}" 吗？此操作不可恢复！`)) {
            console.log('用户确认删除');
            this.deleteTemplate(template);
        } else {
            console.log('用户取消删除');
        }
    }
    
    async deleteTemplate(template) {
        try {
            this.showMessage('正在删除模板...', 'info');
            
            const response = await fetch(`/api/templates/${encodeURIComponent(template.name)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('模板删除成功', 'success');
                
                const isCurrentTemplate = this.isTemplateApplied && this.appliedTemplateName === template.name;
                
                // 刷新模板列表
                await this.loadTemplates(this.currentSubject);
                
                // 如果删除的是当前应用的模板，彻底清空所有状态
                if (isCurrentTemplate) {
                    console.log('删除的是当前应用的模板，彻底清空所有状态');
                    
                    // 清除模板应用状态
                    this.isTemplateApplied = false;
                    this.appliedTemplateName = '';
                    
                    // 清空当前选择的题目
                    this.selectedQuestions = {};
                    
                    // 清空试卷结构和章节统计
                    this.paperStructure = [];
                    this.chapterStats = {};
                    this.totalScore = 0;
                    
                    // 清空模板选择框
                    const templateSelect = document.getElementById('template-select');
                    if (templateSelect) {
                        templateSelect.value = '';
                    }
                    
                    // 更新UI
                    this.updateUI();
                    this.renderCurrentTypeChapters();
                    // 关键修复：更新题库统计，刷新"已选: 0题"
                    this.updateBankStats();
                    
                    // 移除模板应用样式
                    document.getElementById('paper-structure').classList.remove('template-applied');
                    
                    this.showMessage('已清空模板应用状态', 'info');
                } else {
                    // 如果不是当前应用的模板，保持原来的选中状态不变
                    console.log('删除的不是当前应用的模板，保持原选中状态');
                    
                    // 不需要清空任何数据，也不需要改变下拉框
                    // 但需要确保下拉框仍然显示之前选中的模板
                    const templateSelect = document.getElementById('template-select');
                    if (templateSelect && this.appliedTemplateName) {
                        // 检查之前选中的模板是否还存在
                        const templateStillExists = this.templates.some(t => t.name === this.appliedTemplateName);
                        if (!templateStillExists) {
                            // 如果之前选中的模板被删除了，才清空
                            templateSelect.value = '';
                            this.isTemplateApplied = false;
                            this.appliedTemplateName = '';
                            this.clearTemplateApplication();
                        } else {
                            // 保持原来的选中值
                            templateSelect.value = this.appliedTemplateName;
                        }
                    }
                }
                
                // 关闭模板管理模态框
                document.getElementById('template-manage-modal').classList.remove('show');
                
                // 更新管理按钮状态
                this.updateManageTemplatesButton();
                
            } else {
                throw new Error(result.error || '删除失败');
            }
        } catch (error) {
            console.error('删除模板失败:', error);
            this.showMessage('删除模板失败: ' + error.message, 'error');
        } finally {
            // 恢复消息模态框的底部按钮
            const modalFooter = document.querySelector('#message-modal .modal-footer');
            modalFooter.innerHTML = '<button id="modal-confirm" class="btn btn-primary">确定</button>';
        }
    }

       
    setupEventListeners() {
        document.getElementById('subject-select').addEventListener('change', async (e) => {
            this.currentSubject = e.target.value;
            const titleInput = document.getElementById('paper-title');
            const templateSelect = document.getElementById('template-select');
            const paperCountInput = document.getElementById('paper-count');
            const manageBtn = document.getElementById('manage-templates-btn');
            
            if (this.currentSubject) {
                titleInput.disabled = false;
                titleInput.placeholder = "请输入试卷标题";
                titleInput.value = '';
                this.paperTitle = '';
                
                paperCountInput.disabled = false;
                paperCountInput.value = 1;
                paperCountInput.placeholder = "1-10";
                
                templateSelect.value = '';
                
                this.isTemplateApplied = false;
                this.appliedTemplateName = '';
                document.getElementById('paper-structure').classList.remove('template-applied');
                
                this.selectedQuestions = {};
                this.paperStructure = [];
                this.chapterStats = {}; // 清空章节统计
                this.totalScore = 0;
                
                this.updateStatistics();
                this.updateUI();
                
                templateSelect.disabled = false;
                templateSelect.innerHTML = '<option value="">正在加载模板...</option>';
                
                await this.loadTemplates(this.currentSubject);
                await this.loadBankStructure(this.currentSubject);
            } else {
                titleInput.disabled = true;
                titleInput.value = '';
                titleInput.placeholder = "请先选择课程或科目";
                this.paperTitle = '';
                
                paperCountInput.disabled = true;
                paperCountInput.value = 1;
                paperCountInput.placeholder = "请先选择课程或科目";
                
                templateSelect.disabled = true;
                templateSelect.innerHTML = '<option value="">请先选择课程或科目</option>';
                
                if (manageBtn) {
                    manageBtn.style.display = 'none';
                }
                
                this.templates = [];
                
                this.isTemplateApplied = false;
                this.appliedTemplateName = '';
                document.getElementById('paper-structure').classList.remove('template-applied');
                
                this.selectedQuestions = {};
                this.paperStructure = [];
                this.chapterStats = {}; // 清空章节统计
                this.totalScore = 0;
                
                this.updateStatistics();
                this.updateUI();
                this.renderCurrentTypeChapters();
                
                const treeContainer = document.getElementById('bank-tree');
                treeContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-database"></i>
                        <p>请先选择科目</p>
                        <p class="empty-hint">选择科目后，将显示对应的题库结构</p>
                    </div>
                `;
            }
        });
        
        document.getElementById('template-select').addEventListener('change', async (e) => {
            const selectedValue = e.target.value;
            
            if (selectedValue) {
                await this.applyTemplate(selectedValue);
            } else {
                this.clearTemplateApplication();
            }
        });
        
        document.getElementById('paper-title').addEventListener('change', (e) => {
            this.paperTitle = e.target.value || '未命名试卷';
        });
        
        document.getElementById('paper-count').addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 1) {
                e.target.value = 1;
            } else if (value > 10) {
                e.target.value = 10;
                this.showMessage('组卷套数最大为10套', 'warning');
            }
        });
        
        document.getElementById('save-template-btn').addEventListener('click', () => {
            this.saveAsTemplate();
        });
        
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generatePaper();
        });
        
        document.getElementById('preview-btn').addEventListener('click', () => {
            this.previewPaper();
        });
        
        document.getElementById('cancel-btn').addEventListener('click', () => {
            if (confirm('确定要取消吗？所有未保存的更改将丢失。')) {
                location.reload();
            }
        });
        
        document.getElementById('clear-selections').addEventListener('click', () => {
            this.clearSelections();
        });
        
        const userManageBtn = document.getElementById('user-manage-btn');
        if (userManageBtn) {
            userManageBtn.addEventListener('click', () => {
                this.showUserManageModal();
            });
        }
        
        const manageTemplatesBtn = document.getElementById('manage-templates-btn');
        if (manageTemplatesBtn) {
            manageTemplatesBtn.addEventListener('click', () => {
                this.showTemplateManageModal();
            });
        }
        
        document.getElementById('logout-btn-header').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                const result = await response.json();
                if (result.success) {
                    sessionStorage.clear();
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('登出失败:', error);
            }
        });
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('message-modal').classList.remove('show');
        });
        
        document.getElementById('modal-confirm').addEventListener('click', () => {
            document.getElementById('message-modal').classList.remove('show');
        });
        
        document.querySelectorAll('#template-manage-modal .modal-close, #template-manage-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('template-manage-modal').classList.remove('show');
            });
        });
        
        // 编辑对话框关闭按钮
        document.querySelectorAll('#question-edit-modal .modal-close, #edit-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeEditModal();
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveAsTemplate();
            } else if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                this.generatePaper();
            } else if (e.key === 'Escape') {
                document.getElementById('message-modal').classList.remove('show');
                document.getElementById('user-manage-modal').classList.remove('show');
                document.getElementById('template-manage-modal').classList.remove('show');
                this.closeEditModal();
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.paperComposer = new PaperComposer();
});