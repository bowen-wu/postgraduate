#include <stdio.h>

/**
 * 使用宏定义来实现符号常量
    宏的作用是在预处理阶段做文本替换，不会执行编译检查
    0开始的整型字面值是八进制的
    int 4Byte => 32bit -> 2^32 中可能性 -> 负数、0、正数 -> [-2^31, 0), 0, (0, 2^31-1]
    估算 2^31 => 2^10 ≈ 1000 2^20 ≈ 1百万 2^30 ≈ 10亿 2^31 ≈ 20亿
    stdin 标准输入缓冲区 -> scanf/getchar/fgets => 将标准输入缓冲区内的数据 copy 到程序内存中
        性质：
            scanf %d %f %lf 会忽略缓冲区里面前置空白字符（换行、空格、制表符）
            scanf %c 读取一个 char，不会忽略前面的空白字符。getchar() 等价于 scanf %c
    stdout 标准输出缓冲区 -> printf/puts => 将程序内存中的数据放到标准输出缓冲区
        性质：stdout是一种行缓冲，当数据中有换行符的时候，就会刷到屏幕上
        占位符：%c %d %o（八进制整数） %x（十六进制整数） %f(float) %lf(double) %u（无符号整数） %lld %ld %s（字符串）
        puts(str) 等价于 printf("%s\n", str);
    C语言中需要是用字符数组来存储字符串
 */

#define R 3
#define PIE 3.14

int main()
{
    // 整数是精确的，浮点数是近似值，有误差
    float f = 3.14159;
    printf("f = %.10f\n", f); // f = 3.1415901184

    // double 的精度比 float 高
    double d = 3.14159;
    printf("d = %.10f\n", d); // d = 3.1415900000

    // 两个浮点数，如果绝对值相差很大，可能会出现精度丢失的问题
    float a = 1.2345e10;
    float b = a + 20;
    printf("a = %f, b = %f\n", a, b); // a = 12344999936.000000, b = 12344999936.000000

    // scanf
    int i;
    char ch;
    // int ret = scanf("%d", &i); // scanf 返回值是读取成功的变量个数。如果返回值是-1，是特殊情况，称为EOF
    // printf("ret = %d, i = %d\n", ret, i);
    scanf("%d %c", &i, &ch); // scanf %c 前面的空格，可以让 %c 忽略前面的空白字符
    printf("i = %d, ch = %c\n", i, ch);
    return 0;
}
