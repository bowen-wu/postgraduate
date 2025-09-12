#!/bin/bash
# 只编译有变更的 .tex 文件，并行输出 PDF 到同级目录，并删除临时文件

# 获取已修改或新增的 .tex 文件
changed_files=$(git ls-files -m -o --exclude-standard "*.tex")

if [ -z "$changed_files" ]; then
    echo " ⛔ No changed .tex files to compile. ⛔ "
else
    for texfile in $changed_files; do
        texdir=$(dirname "$texfile")
        echo "Compiling $texfile ..."

        # 并行编译
        xelatex -interaction=nonstopmode -output-directory="$texdir/pdf" "$texfile" &
    done

    # 等待所有后台任务完成
    wait

    # 删除所有临时文件
    find . -type f \( -name "*.aux" -o -name "*.log" -o -name "*.out" -o -name "*.toc" \) -delete

    echo "🎉🎉All changed .tex files compiled🎉🎉"
fi
