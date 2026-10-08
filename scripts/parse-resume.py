#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse-resume.py
简历文件全格式智能抽取工具。
支持从 PDF、Markdown、TXT 简历中提取文本并进行基础候选人画像识别（届次、学历、技术栈、城市）。
"""

import sys
import os
import json
import re

def extract_text_from_pdf(pdf_path):
    import pypdf
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += page_text + "\n"
    return text

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    else:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

def parse_profile(raw_text):
    text = raw_text.replace('\r', '\n')
    
    # 届次匹配 (如 2025届, 2026届, 2027年毕业, 2X届)
    grad_year = None
    year_match = re.search(r'(202[4-9]|203[0-5])\s*(届|年毕业|级)', text)
    if year_match:
        grad_year = int(year_match.group(1))
    else:
        short_year_match = re.search(r'(2[4-9])\s*届', text)
        if short_year_match:
            grad_year = 2000 + int(short_year_match.group(1))

    # 学历匹配
    degree = 'bachelor'
    degree_text = '本科'
    if re.search(r'(博士|PhD|Ph\.D)', text, re.I):
        degree = 'phd'
        degree_text = '博士'
    elif re.search(r'(硕士|研究生|Master)', text, re.I):
        degree = 'master'
        degree_text = '硕士'
    elif re.search(r'(本科|学士|Bachelor)', text, re.I):
        degree = 'bachelor'
        degree_text = '本科'
    elif re.search(r'(专科|大专)', text):
        degree = 'junior_college'
        degree_text = '大专'

    # 常见技术栈捕获
    skills = []
    keywords = [
        'Python', 'Java', 'Golang', 'Go', 'C++', 'Rust', 'JavaScript', 'TypeScript',
        'AI Agent', '智能体', 'Multi-Agent', 'LLM', '大模型', 'RAG', 'LangChain',
        'LangGraph', 'Dify', 'Coze', 'Prompt', '提示词', 'FastAPI', 'Spring Boot',
        'PyTorch', 'vLLM', 'Vector DB', 'Milvus', 'Chroma', 'Docker', 'K8s',
        'Vibe Coding', 'ReAct', 'Function Calling'
    ]
    for kw in keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text, re.I) or (not re.match(r'^[A-Za-z]+$', kw) and kw in text):
            if kw not in skills:
                skills.append(kw)

    # 意向岗位类型
    role_type = 'intern' if re.search(r'(实习|在校生|日常实习)', text) else 'fulltime'

    return {
        'degree': degree,
        'degreeLevelText': degree_text,
        'gradYear': grad_year,
        'targetRoleType': role_type,
        'detectedSkills': skills,
        'rawExcerpt': text[:400].replace('\n', ' ').strip()
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python parse-resume.py <resume_path> [--output <json_path>]")
        sys.exit(1)

    resume_path = sys.argv[1]
    output_path = None
    if '--output' in sys.argv:
        idx = sys.argv.index('--output')
        if idx + 1 < len(sys.argv):
            output_path = sys.argv[idx + 1]

    if not os.path.exists(resume_path):
        print(f"Error: 简历文件未找到: {resume_path}", file=sys.stderr)
        sys.exit(1)

    try:
        raw_text = extract_text_from_file(resume_path)
        profile = parse_profile(raw_text)
        profile['resumeFile'] = os.path.abspath(resume_path)
        
        result_json = json.dumps(profile, ensure_ascii=False, indent=2)
        print(result_json)

        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(result_json)
            print(f"\n[+] 简历画像已导出至: {output_path}")

    except Exception as e:
        print(f"Error parsing resume: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
