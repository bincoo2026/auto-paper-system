from pathlib import Path
from typing import Dict, Any, List
import json
from datetime import datetime
import random
import hashlib
import time
from question_parser import QuestionParser

# 尝试导入pypandoc，如果失败则提供降级处理
try:
    import pypandoc
    PYPANDOC_AVAILABLE = True
except ImportError:
    PYPANDOC_AVAILABLE = False
    print("警告: pypandoc未安装，将只生成Markdown格式文件")

class PaperGenerator:
    """试卷生成器"""
    
    # 添加类变量，用于缓存已生成试卷的选择
    _paper_selections = []  # 格式: [{{(subject, type_name, chapter, topic): [selected_indices]}}]
    
    @staticmethod
    def convert_to_word(md_path: Path) -> Path:
        """将Markdown文件转换为Word文档"""
        if not PYPANDOC_AVAILABLE:
            print(f"pypandoc未安装，跳过转换: {md_path.name}")
            return None
        
        try:
            from backend.config import Config
            
            word_path = md_path.with_suffix('.docx')
            input_format = 'markdown+hard_line_breaks'
            # 获取Markdown文件所在目录作为资源路径
            resource_path = str(md_path.parent)

            extra_args = [
                '--mathml',
                '--wrap=preserve',
                f'--resource-path={resource_path}'
            ]
            
            # 如果存在参考文档，使用它来定制样式
            print(f"检查参考文档路径: {Config.REFERENCE_DOCX}")
            print(f"参考文档是否存在: {Config.REFERENCE_DOCX.exists()}")
            if Config.REFERENCE_DOCX.exists():
                extra_args.append(f'--reference-doc={str(Config.REFERENCE_DOCX)}')
                print(f"使用参考文档定制样式: {Config.REFERENCE_DOCX}")
            else:
                print("参考文档不存在，使用默认样式")

            pypandoc.convert_file(
                str(md_path),
                'docx',
                format=input_format,
                outputfile=str(word_path),
                extra_args=extra_args
            )
            print(f"✓ 已生成Word版本: {word_path.name}")
            return word_path
        except Exception as e:
            print(f"✗ Word转换失败 {md_path.name}: {e}")
            return None
    
    @staticmethod
    def save_paper_files(paper_data: Dict[str, Any], output_dir: Path, user_id: str = 'admin'):
        """保存单套试卷文件并转换为Word"""
        from backend.config import Config
        
        output_dir.mkdir(exist_ok=True)
        
        import re
        title = paper_data.get('title', '试卷')
        safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
        
        paper_content = PaperGenerator.generate_paper_content(paper_data, Config.BANK_ROOT, user_id)
        
        # 处理图片路径
        PaperGenerator._process_image_paths(paper_content, output_dir)
        
        student_content = CustomPaperFormatter.format_student_paper(paper_content)
        student_filename = f"{safe_title}_学生卷.md"
        student_path = output_dir / student_filename
        
        with open(student_path, 'w', encoding='utf-8') as f:
            f.write(student_content)
        
        teacher_content = CustomPaperFormatter.format_teacher_paper(paper_content)
        teacher_filename = f"{safe_title}_教师卷.md"
        teacher_path = output_dir / teacher_filename
        
        with open(teacher_path, 'w', encoding='utf-8') as f:
            f.write(teacher_content)
        
        json_filename = f"{safe_title}_试卷内容.json"
        json_path = output_dir / json_filename
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(paper_content, f, ensure_ascii=False, indent=2)
        
        return {
            'student_file': student_filename,
            'teacher_file': teacher_filename,
            'json_file': json_filename,
            'student_path': str(student_path),
            'teacher_path': str(teacher_path),
            'json_path': str(json_path),
            'student_word_path': str(student_path.with_suffix('.docx')),
            'teacher_word_path': str(teacher_path.with_suffix('.docx'))
        }
    
    @staticmethod
    def _process_image_paths(paper_content: Dict[str, Any], output_dir: Path):
        """处理试卷中的图片路径"""
        import shutil
        from pathlib import Path
        
        # 创建images目录
        images_dir = output_dir / 'images'
        images_dir.mkdir(exist_ok=True)
        
        for section in paper_content.get('questions', []):
            for question in section.get('questions', []):
                content = question.get('content', '')
                source_file = question.get('source_file', '')
                
                if content and source_file:
                    # 查找图片引用
                    import re
                    image_pattern = r'!\[(.*?)\]\((.*?)\)'
                    images = re.findall(image_pattern, content)
                    
                    if images:
                        source_path = Path(source_file)
                        for alt_text, img_path in images:
                            # 构建原始图片路径
                            if not img_path.startswith(('http://', 'https://')):
                                # 相对路径
                                original_img_path = source_path.parent / img_path
                                if original_img_path.exists():
                                    # 复制图片到输出目录
                                    img_name = original_img_path.name
                                    dest_img_path = images_dir / img_name
                                    shutil.copy2(original_img_path, dest_img_path)
                                    # 更新图片路径为相对路径
                                    new_img_path = f'images/{img_name}'
                                    content = content.replace(f'![{alt_text}]({img_path})', f'![{alt_text}]({new_img_path})')
                        # 更新题目内容
                        question['content'] = content

    @staticmethod
    def save_multiple_paper_files(paper_data: Dict[str, Any], output_dir: Path, paper_count: int = 1, user_id: str = 'admin'):
        """保存多套试卷文件到同一个文件夹并转换为Word"""
        from backend.config import Config
        
        import re
        title = paper_data.get('title', '试卷')
        safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        folder_name = f"{user_id}_{safe_title}_{timestamp}"
        batch_folder = output_dir / folder_name
        batch_folder.mkdir(exist_ok=True)
        
        results = []
        
        print(f"\n===== 开始生成 {paper_count} 套试卷 =====")
        
        PaperGenerator._paper_selections = []
        
        for paper_index in range(1, paper_count + 1):
            print(f"\n--- 正在生成第 {paper_index} 套卷 ---")
            
            current_ms = int(time.time() * 1000)
            random_salt = random.randint(100000, 999999)
            
            base_seed_str = f"{title}_{timestamp}_{paper_index}_{current_ms}_{random_salt}_{random.randint(1, 10000)}"
            paper_seed = int(hashlib.md5(base_seed_str.encode()).hexdigest()[:8], 16)
            
            paper_seed = paper_seed + paper_index * 100000 + random_salt
            
            paper_content = PaperGenerator.generate_paper_content_with_seed(
                paper_data, Config.BANK_ROOT, paper_seed, paper_index, paper_count, user_id
            )
            
            # 处理图片路径
            PaperGenerator._process_image_paths(paper_content, batch_folder)
            
            student_content = CustomPaperFormatter.format_student_paper(paper_content)
            student_filename = f"{safe_title}_第{paper_index}套_学生卷.md"
            student_path = batch_folder / student_filename
            
            with open(student_path, 'w', encoding='utf-8') as f:
                f.write(student_content)
            
            teacher_content = CustomPaperFormatter.format_teacher_paper(paper_content)
            teacher_filename = f"{safe_title}_第{paper_index}套_教师卷.md"
            teacher_path = batch_folder / teacher_filename
            
            with open(teacher_path, 'w', encoding='utf-8') as f:
                f.write(teacher_content)
            
            json_filename = f"{safe_title}_第{paper_index}套_试卷内容.json"
            json_path = batch_folder / json_filename
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(paper_content, f, ensure_ascii=False, indent=2)
            
            results.append({
                'paper_index': paper_index,
                'student_file': student_filename,
                'teacher_file': teacher_filename,
                'json_file': json_filename,
                'student_path': str(student_path),
                'teacher_path': str(teacher_path),
                'json_path': str(json_path),
                'student_word_path': str(student_path.with_suffix('.docx')),
                'teacher_word_path': str(teacher_path.with_suffix('.docx')),
                'seed': paper_seed
            })
        
        print(f"\n===== {paper_count} 套试卷生成完成 =====")
        
        return {
            'folder': str(batch_folder),
            'folder_name': folder_name,
            'files': results
        }

    @staticmethod
    def get_random_questions_from_bank_exclude(subject: str, question_type: str, chapter: str, topic: str, count: int, bank_root: Path, user_id: str, seed: int = None, paper_index: int = 1) -> List[Dict[str, Any]]:
        """从题库中随机抽取指定数量的题目，排除所有已生成试卷的题目"""
        # 构建文件路径 - 使用用户ID
        file_path = bank_root / user_id / subject / question_type / chapter / f"{topic}.md"
        
        if not file_path.exists():
            print(f"题库文件不存在: {file_path}")
            return []
        
        questions = QuestionParser.parse_question_file(file_path)
        
        if not questions:
            print(f"题库文件为空或解析失败: {file_path}")
            return []
        
        total = len(questions)
        
        topic_key = (subject, question_type, chapter, topic)
        
        # 收集所有已选索引
        excluded_indices = []
        for paper_selection in PaperGenerator._paper_selections:
            if topic_key in paper_selection:
                excluded_indices.extend(paper_selection[topic_key])
        
        if paper_index == 1:
            # 第一套卷，不需要排除
            if seed is not None:
                random.seed(seed)
                indices = list(range(total))
                random.shuffle(indices)
                selected_indices = indices[:count]
            else:
                indices = list(range(total))
                random.shuffle(indices)
                selected_indices = indices[:count]
            
            result = [questions[i] for i in selected_indices]
            
            # 保存第一套卷的选择
            if not PaperGenerator._paper_selections:
                PaperGenerator._paper_selections.append({})
            PaperGenerator._paper_selections[0][topic_key] = selected_indices
            print(f"  第 {paper_index} 套卷，考点 {chapter}/{topic} 从 {total} 题中选择了索引: {selected_indices}")
            
        else:
            # 排除所有已选索引
            available_indices = [i for i in range(total) if i not in excluded_indices]
            
            if len(available_indices) < count:
                print(f"  警告：考点 {chapter}/{topic} 可用题目不足，将允许重复")
                if seed is not None:
                    random.seed(seed)
                    indices = list(range(total))
                    random.shuffle(indices)
                    selected_indices = indices[:count]
                else:
                    indices = list(range(total))
                    random.shuffle(indices)
                    selected_indices = indices[:count]
            else:
                if seed is not None:
                    random.seed(seed)
                    random.shuffle(available_indices)
                    selected_indices = available_indices[:count]
                else:
                    random.shuffle(available_indices)
                    selected_indices = available_indices[:count]
            
            result = [questions[i] for i in selected_indices]
            
            # 保存当前套卷的选择
            if len(PaperGenerator._paper_selections) < paper_index:
                PaperGenerator._paper_selections.append({})
            PaperGenerator._paper_selections[paper_index-1][topic_key] = selected_indices
            print(f"  第 {paper_index} 套卷，考点 {chapter}/{topic} 选择了索引: {selected_indices} (避开已选: {excluded_indices})")
        
        return result
    
    @staticmethod
    def generate_paper_content(paper_data: Dict[str, Any], bank_root: Path, user_id: str) -> Dict[str, Any]:
        """生成单套试卷内容"""
        seed_str = f"{paper_data.get('title', '')}_{paper_data.get('subject', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        
        return PaperGenerator.generate_paper_content_with_seed(paper_data, bank_root, seed, 1, 1, user_id)
    
    @staticmethod
    def generate_paper_content_with_seed(paper_data: Dict[str, Any], bank_root: Path, seed: int, paper_index: int = 1, total_papers: int = 1, user_id: str = 'admin') -> Dict[str, Any]:
        """使用指定种子生成试卷内容"""
        all_selected_questions = []
        selections = paper_data.get('selections', {})
        
        print(f"\n===== 生成第 {paper_index} 套卷，基础种子: {seed} =====")
        
        global_offset = (seed % 10000) + paper_index * 1000 + random.randint(1, 10000)
        
        for section in paper_data.get('sections', []):
            type_name = section.get('type_name', '')
            question_count = section.get('question_count', 0)
            
            print(f"  处理题型: {type_name}, 需要 {question_count} 题")
            
            section_questions = []
            
            if selections and bank_root:
                type_selections = {}
                for key, selection in selections.items():
                    parts = key.split('/')
                    if len(parts) >= 4 and parts[1] == type_name:
                        chapter_name = parts[2]
                        topic_name = parts[3]
                        type_selections[(chapter_name, topic_name)] = selection
                
                print(f"    当前题型找到 {len(type_selections)} 个考点")
                
                remaining_count = question_count
                for (chapter_name, topic_name), selection in type_selections.items():
                    count_to_select = min(selection.get('count', 0), remaining_count)
                    if count_to_select > 0:
                        chapter_hash = int(hashlib.md5(chapter_name.encode()).hexdigest()[:4], 16)
                        topic_hash = int(hashlib.md5(topic_name.encode()).hexdigest()[:4], 16)
                        
                        combined_seed = (
                            seed + 
                            paper_index * 100000 +
                            chapter_hash * 1000 +
                            topic_hash * 10 +
                            global_offset +
                            random.randint(1, 10000)
                        )
                        
                        topic_seed = combined_seed % (2**31 - 1)
                        
                        topic_key = (paper_data.get('subject', ''), type_name, chapter_name, topic_name)
                        
                        questions = PaperGenerator.get_random_questions_from_bank_exclude(
                            paper_data.get('subject', ''),
                            type_name,
                            chapter_name,
                            topic_name,
                            count_to_select,
                            bank_root,
                            user_id,
                            seed=topic_seed,
                            paper_index=paper_index
                        )
                        section_questions.extend(questions)
                        remaining_count -= count_to_select
                        print(f"    从考点 {chapter_name}/{topic_name} 抽取 {len(questions)} 题，还剩 {remaining_count} 题需要抽取")
                
                if len(section_questions) < question_count:
                    print(f"    警告：题型 {type_name} 只抽到 {len(section_questions)} 题，需要 {question_count} 题，补充占位符")
                    for i in range(question_count - len(section_questions)):
                        section_questions.append({
                            'content': f'【{type_name}题目】',
                            'answer': '待补充',
                            'analysis': '待补充',
                            'difficulty': '中等'
                        })
            else:
                for i in range(question_count):
                    section_questions.append({
                        'content': f'【{type_name}题目】',
                        'answer': '待补充',
                        'analysis': '待补充',
                        'difficulty': '中等'
                    })
            
            all_selected_questions.append({
                'type_name': type_name,
                'questions': section_questions
            })
        
        print(f"===== 第 {paper_index} 套卷生成完成 =====\n")
        
        return {
            'paper_info': paper_data,
            'questions': all_selected_questions,
            'seed': seed
        }

    @staticmethod
    def save_template(template_data: Dict[str, Any], template_dir: Path, user_id: str) -> bool:
        """保存组卷模板"""
        if 'name' not in template_data:
            return False
        
        template_name = template_data['name']
        
        import re
        safe_name = re.sub(r'[<>:"/\\|?*]', '', template_name)
        
        # 文件名添加用户前缀
        file_path = template_dir / f"{user_id}_{safe_name}.json"
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存模板失败: {e}")
            return False
    
    @staticmethod
    def load_template(template_name: str, template_dir: Path) -> Dict[str, Any]:
        """加载组卷模板"""
        file_path = template_dir / f"{template_name}.json"
        
        if not file_path.exists():
            return {}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载模板失败: {e}")
            return {}
    
    @staticmethod
    def list_templates(template_dir: Path, user_id: str, subject: str = '') -> List[Dict[str, Any]]:
        """列出当前用户的模板，可按科目筛选"""
        templates = []
        
        if not template_dir.exists():
            return templates
        
        print(f"用户 {user_id} 加载模板，科目筛选: {subject}")

        for file in template_dir.glob(f"{user_id}_*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    template_subject = data.get('subject', '')

                    if subject and template_subject != subject:
                        continue
                    
                    # 移除用户前缀显示
                    display_name = data.get('name', file.stem.replace(f"{user_id}_", ""))
                    
                    templates.append({
                        'name': file.stem,  # 完整文件名作为唯一标识
                        'display_name': display_name,
                        'title': data.get('title', display_name),
                        'subject': template_subject,
                        'created_at': data.get('created_at', '')
                    })
            except Exception as e:
                print(f"加载模板文件失败 {file}: {e}")
                if not subject:
                    templates.append({
                        'name': file.stem,
                        'display_name': file.stem.replace(f"{user_id}_", ""),
                        'title': file.stem.replace(f"{user_id}_", ""),
                        'subject': '',
                        'created_at': ''
                    })

        print(f"返回 {len(templates)} 个模板")
        return sorted(templates, key=lambda x: x['display_name'])

class CustomPaperFormatter:
    """自定义试卷排版器"""
    
    @staticmethod
    def format_student_paper(paper_content: Dict[str, Any]) -> str:
        """生成自定义格式的学生卷"""
        paper_data = paper_content['paper_info']
        all_questions = paper_content['questions']
        
        lines = []
        
        lines.append(f"**某某学校 / 学年第  学期**")
        lines.append("") 
        title = paper_data.get('title', '未命名试卷')
     
        lines.append(f"**级  各专业《{title}》 课程期末试卷( 卷)**")
        lines.append("")
        lines.append(f"**（考试形式：闭卷     考试时间：120分钟）**")
        lines.append("")
        lines.append(f"**学院_____________班级_____________学号_____________姓名___________**")
        lines.append("")
       
        CustomPaperFormatter.add_score_table(lines, paper_data, all_questions)
        
        chinese_numbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
        
        for i, section_data in enumerate(all_questions):
            type_name = section_data['type_name']
            section_questions = section_data['questions']
            question_count = len(section_questions)
            
            total_score = 0
            for section in paper_data.get('sections', []):
                if section.get('type_name') == type_name:
                    total_score = section.get('total_score', 0)
                    break
            
            per_question_score = total_score / question_count if question_count > 0 else 0
            
            chinese_num = chinese_numbers[i] if i < len(chinese_numbers) else str(i+1)
            lines.append(f"**{chinese_num}、{type_name}（共{question_count}小题，每小题{per_question_score:.1f}分，共{total_score}分）**")
            lines.append("")
            
            for j, question in enumerate(section_questions, 1):
                content = question.get('content', '').strip()
                
                lines.append(f"**{j}.** {content}")
                lines.append("")
                
                if type_name == '选择题' and 'options' in question:
                    options = question.get('options', [])
                    for option in options:
                        lines.append(f"  {option}")
                    lines.append("")
            
            if i < len(all_questions) - 1:
               lines.append("")
        
        return '\n'.join(lines)
   
    @staticmethod
    def add_score_table(lines, paper_data, all_questions):
        """添加分数登记表"""
        sections = paper_data.get('sections', [])
        total_score = paper_data.get('total_score', 0)
        section_count = len(sections)
        
        chinese_numbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
        
        lines.append("")
        
        header = "| 题号 |"
        for i in range(section_count):
            chinese_num = chinese_numbers[i] if i < len(chinese_numbers) else str(i+1)
            header += f" {chinese_num} |"
        header += " 总分 |"
        lines.append(header)
        
        separator = "|:---:|"
        for _ in range(section_count):
            separator += ":---:|"
        separator += ":---:|"
        lines.append(separator)
        
        score_row = "| 分值 |"
        for section in sections:
            section_score = section.get('total_score', 0)
            score_row += f" {section_score} |"
        score_row += f" {total_score} |"
        lines.append(score_row)
        
        score_cell_row = "| 得分 |"
        for _ in range(section_count):
            score_cell_row += "    |"
        score_cell_row += "    |"
        lines.append(score_cell_row)
        
        reviewer_row = "| 阅卷人 |"
        for _ in range(section_count):
            reviewer_row += "    |"
        reviewer_row += "    |"
        lines.append(reviewer_row)
        
        lines.append("")
        lines.append("")
    
    @staticmethod
    def format_teacher_paper(paper_content: Dict[str, Any]) -> str:
        """生成自定义格式的教师卷"""
        paper_data = paper_content['paper_info']
        all_questions = paper_content['questions']
        
        lines = []
        
        lines.append(f"**某某学校 / 学年第  学期**")
        lines.append("") 
        title = paper_data.get('title', '未命名试卷')
     
        lines.append(f"**级  各专业《{title}》 课程期末试卷( 卷)**")
        lines.append("")
        lines.append(f"**（考试形式：闭卷  考试时间：120分钟）**")
        lines.append("")
        lines.append(f"**（参考答案与评分标准）**")
        lines.append("")
        lines.append("")
                
        objective_types = ['选择题', '填空题', '判断题']
        subjective_types = ['计算题', '解答题', '应用题', '证明题']
        chinese_numbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

        for i, section_data in enumerate(all_questions):
            type_name = section_data['type_name']
            section_questions = section_data['questions']
                     
            question_count = len(section_questions)
            
            total_score = 0
            for section in paper_data.get('sections', []):
                if section.get('type_name') == type_name:
                    total_score = section.get('total_score', 0)
                    break
            
            per_question_score = total_score / question_count if question_count > 0 else 0
            
            chinese_num = chinese_numbers[i] if i < len(chinese_numbers) else str(i+1)
            
            lines.append(f"**{chinese_num}、{type_name}（共{question_count}小题，每小题{per_question_score:.1f}分，共{total_score}分）**")
            lines.append("")

            if type_name in objective_types:
                answers = []
                for j, question in enumerate(section_questions, 1):
                    answer = question.get('answer', '')
                    if not answer.strip():
                        answer = '未设置'
                    answers.append(f"**{j}**. {answer}")
                lines.append('  '.join(answers))
                
            elif type_name in subjective_types:
                for j, question in enumerate(section_questions, 1):
                    content = question.get('content', '').strip()
                    analysis = question.get('analysis', '')
                    
                    lines.append(f"**{j}**. {content}")
                    if analysis:
                        lines.append(f"解：{analysis}")
                    lines.append("")
            else:
                for j, question in enumerate(section_questions, 1):
                    content = question.get('content', '').strip()
                    answer = question.get('answer', '')
                    analysis = question.get('analysis', '')
                    
                    lines.append("")
                    lines.append(f"**{j}**. {content}")
                    if answer:
                        lines.append(f"答案：{answer}")
                    if analysis:
                        lines.append(f"解：{analysis}")
                    lines.append("")
            
            lines.append("")
        
        return '\n'.join(lines)