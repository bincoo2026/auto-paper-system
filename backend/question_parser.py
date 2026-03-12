import re
from pathlib import Path
from typing import List, Dict, Any

class QuestionParser:
    """题库解析器"""
    
    # 添加缓存，格式: {file_path: (last_modified, questions)}
    _question_cache = {}
    
    @staticmethod
    def parse_question_file(file_path: Path) -> List[Dict[str, Any]]:
        """解析单个题库文件，使用缓存提高性能"""
        if not file_path.exists():
            return []
        
        # 检查缓存
        last_modified = file_path.stat().st_mtime
        if file_path in QuestionParser._question_cache:
            cached_mtime, cached_questions = QuestionParser._question_cache[file_path]
            if cached_mtime == last_modified:
                print(f"使用缓存解析文件: {file_path}")
                return cached_questions
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 按 '---' 分割题目
            raw_questions = [q.strip() for q in content.split('---') if q.strip()]
            questions = []
            
            for i, q_text in enumerate(raw_questions, 1):
                question = QuestionParser.parse_single_question(q_text)
                if question:
                    question['id'] = f"q{i}"
                    # 记录题目来源文件路径，用于处理图片
                    question['source_file'] = str(file_path)
                    questions.append(question)
            
            # 更新缓存
            QuestionParser._question_cache[file_path] = (last_modified, questions)
            print(f"解析并缓存文件: {file_path}")
            return questions
        except Exception as e:
            print(f"解析文件失败 {file_path}: {e}")
            return []
    
    @staticmethod
    def clear_cache():
        """清空缓存"""
        QuestionParser._question_cache.clear()
        print("题目缓存已清空")
    
    @staticmethod
    def parse_single_question(text: str) -> Dict[str, Any]:
        """解析单道题目 - 保留空行以便pypandoc识别表格"""
        # 按行分割，但保留空行
        lines = text.split('\n')
        if not lines:
            return None
        
        question = {
            'content': '',
            'options': [],
            'answer': '',
            'analysis': '',
            'difficulty': '中等',
            'score': 1
        }
        
        current_section = 'content'
        content_lines = []
        
        for line in lines:
            # 检查是否是特殊标记行（用strip()检查，但保留原始行用于内容）
            stripped_line = line.strip()
            
            # 跳过标题行（以#开头）
            if line.lstrip().startswith('#'):
                continue
                
            # 检查是否是特殊标记行
            if stripped_line.startswith('答案：') or stripped_line.startswith('答案:'):
                if content_lines:
                    question['content'] = '\n'.join(content_lines)
                question['answer'] = stripped_line.replace('答案：', '').replace('答案:', '').strip()
                current_section = 'answer'
            elif stripped_line.startswith('解析：') or stripped_line.startswith('解析:'):
                question['analysis'] = stripped_line.replace('解析：', '').replace('解析:', '').strip()
                current_section = 'analysis'
            elif stripped_line.startswith('难度：') or stripped_line.startswith('难度:'):
                question['difficulty'] = stripped_line.replace('难度：', '').replace('难度:', '').strip()
            elif stripped_line.startswith('分值：') or stripped_line.startswith('分值:'):
                try:
                    question['score'] = float(stripped_line.replace('分值：', '').replace('分值:', '').strip())
                except:
                    pass
            elif stripped_line.startswith('A.') or stripped_line.startswith('B.') or stripped_line.startswith('C.') or stripped_line.startswith('D.'):
                # 处理选项，确保格式一致
                option = stripped_line
                # 移除多余的空格
                option = re.sub(r'\s+', ' ', option)
                question['options'].append(option)
                current_section = 'options'
            elif current_section == 'content':
                # 保留原始行，包括空行
                # 如果行是空的，添加一个空字符串（会变成换行）
                content_lines.append(line.rstrip('\n'))
            elif current_section == 'analysis' and question['analysis']:
                # 保留原始行，包括空行
                question['analysis'] += '\n' + line.rstrip('\n')
        
        # 如果没有显式的内容结束标记，所有行都是内容
        if not question['content'] and content_lines:
            question['content'] = '\n'.join(content_lines)
        
        # 提取题干中的选择题选项（保持不变）
        if not question['options']:
            # 增强选项提取正则表达式，支持更多格式
            option_pattern = r'[A-D][\.\、]\s*[^\n]+'
            content = question['content']
            options = re.findall(option_pattern, content)
            if options:
                # 处理选项，确保格式一致
                processed_options = []
                for opt in options:
                    # 移除多余的空格
                    opt = re.sub(r'\s+', ' ', opt)
                    processed_options.append(opt)
                question['options'] = processed_options
                # 从题干中移除选项
                for opt in options:
                    content = content.replace(opt, '')
                question['content'] = content.strip()
        
        # 清理内容，移除多余的空白行
        question['content'] = re.sub(r'\n{3,}', '\n\n', question['content']).strip()
        question['analysis'] = re.sub(r'\n{3,}', '\n\n', question['analysis']).strip()
        
        return question

       
    @staticmethod
    def count_questions_in_file(file_path: Path) -> int:
        """统计文件中的题目数量"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            questions = [q.strip() for q in content.split('---') if q.strip()]
            return len(questions)
        except:
            return 0