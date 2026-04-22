#include <stdio.h>

// 使用宏定义来实现符号常量
// 宏的作用是在预处理阶段做文本替换，不会执行编译检查
#define R 3
#define PIE 3.14

int main()
{
    int i = 1;
    i = i + 2;
    i = i + 3;
    i = i + 4;
    return 0;
}
