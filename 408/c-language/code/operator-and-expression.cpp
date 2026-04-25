#include <stdio.h>

// 判断大小关系 <, <=, >, >=。满足条件返回值就是1，不满足条件返回值就是0
// 单目运算符 > 算术运算符 > 关系运算符 > 逻辑运算符
int main() {
    int a = -3, b = -2, c = -1;
    printf("a < b < c is %d\n", a < b < c);

    int d = 1, e = 2, f = 1;
    printf("a == b < c is %d\n", a == b < c); // 先做<，再 ==

    int x, y;
    x = y = 2;
    return 0;
}
