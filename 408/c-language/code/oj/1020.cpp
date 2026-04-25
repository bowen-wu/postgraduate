#include <stdio.h>

/**
 * http://oj.lgwenda.com/problem/1020
* 检查一个数是否为质数
Description

输入一个正整数，检查该数是否为质数


Input

输入一个正整数


Output

输出Y或者N
 */

int main() {
    int num;
    scanf("%d", &num);

    int found = 0;
    for (int i = 2; i * i <= num; i++) {
        if (num % i == 0) {
            found = 1;
            printf("N\n");
            break;
        }
    }
    if (!found) {
        printf("Y\n");
    }

    return 0;
}
